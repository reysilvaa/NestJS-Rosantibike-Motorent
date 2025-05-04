import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger, Injectable, Inject, Optional } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { corsOptions } from '../config/cors.config';

@WebSocketGateway({
  cors: corsOptions,
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 60_000,
  allowUpgrades: true,
  upgradeTimeout: 30_000,
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() server: Server;

  private clients: Map<string, Socket> = new Map();

  // Map untuk melacak koneksi per IP
  private ipConnections: Map<string, Set<string>> = new Map();
  private readonly maxConnectionsPerIp = 20;

  // Batasan total koneksi websocket
  private totalConnections = 0;
  private readonly maxTotalConnections = 100;
  private readonly minTotalConnections = 20;

  // Threshold untuk Redis pub/sub
  private readonly redisPubSubThreshold = 200;

  // Flag untuk menunjukkan apakah Redis digunakan
  private useRedisPubSub = false;
  private redisServiceAvailable = false;

  constructor(@Optional() @Inject('REDIS_PUB_SUB_SERVICE') private redisPubSubService?: any) {
    // Inisialisasi Redis pub/sub jika tersedia
    if (this.redisPubSubService) {
      try {
        // Cek apakah Redis service tersedia
        this.redisServiceAvailable = this.isRedisServiceAvailable();
        if (this.redisServiceAvailable) {
          this.useRedisPubSub = true;
          this.logger.log('Redis pub/sub service tersedia dan diaktifkan.');
        } else {
          this.logger.warn('Redis pub/sub service tidak tersedia. Menggunakan direct broadcast.');
        }
      } catch (error) {
        this.logger.error(`Error saat inisialisasi Redis pub/sub: ${error.message}`);
        this.redisServiceAvailable = false;
        this.useRedisPubSub = false;
      }
    }
  }

  /**
   * Memeriksa apakah Redis service tersedia
   */
  private isRedisServiceAvailable(): boolean {
    try {
      if (!this.redisPubSubService) return false;

      // Memeriksa jika Redis service memiliki metode isConnected
      if (typeof this.redisPubSubService.isConnected === 'function') {
        return this.redisPubSubService.isConnected();
      }

      // Alternatif: periksa jika Redis service memiliki client yang terhubung
      if (this.redisPubSubService.client && this.redisPubSubService.client.status === 'ready') {
        return true;
      }

      // Mencoba mengakses Redis lain jika tersedia
      if (
        this.redisPubSubService.getClient &&
        typeof this.redisPubSubService.getClient === 'function'
      ) {
        const client = this.redisPubSubService.getClient();
        return client && (client.status === 'ready' || client.status === 'connect');
      }

      return false;
    } catch (error) {
      this.logger.error(`Error memeriksa koneksi Redis: ${error.message}`);
      return false;
    }
  }

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    // Periksa jumlah total koneksi
    if (this.totalConnections >= this.maxTotalConnections) {
      this.logger.warn(
        `Maximum total WebSocket connections (${this.maxTotalConnections}) reached. Rejecting new connection.`,
      );
      client.emit('error', {
        message:
          'Server sedang sibuk. Batas maksimum koneksi telah tercapai. Silakan coba lagi nanti.',
      });
      client.disconnect(true);
      return;
    }

    const userId = client.handshake.query.userId as string;
    const clientIp =
      client.handshake.headers['x-forwarded-for'] ||
      client.handshake.address ||
      client.conn.remoteAddress;

    // Periksa jumlah koneksi dari IP ini
    const ipSocketIds = this.ipConnections.get(clientIp as string) || new Set();

    // Batasi koneksi per IP
    if (ipSocketIds.size >= this.maxConnectionsPerIp) {
      this.logger.warn(
        `Maximum WebSocket connections (${this.maxConnectionsPerIp}) reached for IP: ${clientIp}`,
      );
      client.emit('error', {
        message: 'Batas maksimum koneksi tercapai. Silakan coba lagi nanti.',
      });
      client.disconnect(true);
      return;
    }

    // Tambahkan socketId ke daftar koneksi IP
    ipSocketIds.add(client.id);
    this.ipConnections.set(clientIp as string, ipSocketIds);

    // Tambah jumlah total koneksi
    this.totalConnections++;

    // Update penggunaan Redis berdasarkan jumlah koneksi
    this.updateRedisPubSubUsage();

    if (userId) {
      this.clients.set(userId, client);
      this.logger.log(`Client connected: ${client.id}, userId: ${userId}, IP: ${clientIp}`);
    } else {
      this.logger.log(`Client connected: ${client.id}, no userId, IP: ${clientIp}`);
    }

    // Kirim pesan konfirmasi koneksi ke client
    client.emit('connected', {
      status: 'connected',
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });

    // Setup interval ping untuk mencegah terputus (lebih sering)
    const pingInterval = setInterval(() => {
      if (client.connected) {
        client.emit('ping', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(pingInterval);
      }
    }, 15_000);

    // Menyimpan interval di objek client untuk dibersihkan saat disconnect
    client.data.pingInterval = pingInterval;
  }

  handleDisconnect(client: Socket) {
    // Membersihkan interval ping
    if (client.data.pingInterval) {
      clearInterval(client.data.pingInterval);
    }

    // Hapus dari daftar koneksi IP
    const clientIp =
      client.handshake.headers['x-forwarded-for'] ||
      client.handshake.address ||
      client.conn.remoteAddress;

    if (clientIp) {
      const ipSocketIds = this.ipConnections.get(clientIp as string);
      if (ipSocketIds) {
        ipSocketIds.delete(client.id);
        if (ipSocketIds.size === 0) {
          this.ipConnections.delete(clientIp as string);
        } else {
          this.ipConnections.set(clientIp as string, ipSocketIds);
        }
      }
    }

    // Mencari dan menghapus klien dari map clients
    for (const [userId, socket] of this.clients.entries()) {
      if (socket.id === client.id) {
        this.clients.delete(userId);
        this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
        break;
      }
    }

    // Kurangi jumlah total koneksi
    this.totalConnections--;

    // Update penggunaan Redis berdasarkan jumlah koneksi
    this.updateRedisPubSubUsage();

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Update penggunaan Redis pub/sub berdasarkan jumlah koneksi
   */
  private updateRedisPubSubUsage() {
    // Jika Redis service tidak tersedia, tidak perlu update
    if (!this.redisServiceAvailable) {
      this.useRedisPubSub = false;
      return;
    }

    try {
      // Periksa ulang jika Redis masih terhubung
      this.redisServiceAvailable = this.isRedisServiceAvailable();
      if (!this.redisServiceAvailable) {
        this.useRedisPubSub = false;
        this.logger.warn('Redis service terputus. Beralih ke direct broadcast.');
        return;
      }

      // Gunakan Redis hanya jika koneksi < threshold
      const shouldUseRedis = this.totalConnections < this.redisPubSubThreshold;

      if (shouldUseRedis !== this.useRedisPubSub) {
        this.useRedisPubSub = shouldUseRedis;
        this.logger.log(
          `Redis pub/sub ${this.useRedisPubSub ? 'diaktifkan' : 'dinonaktifkan'} (Koneksi: ${this.totalConnections})`,
        );
      }
    } catch (error) {
      this.logger.error(`Error saat update penggunaan Redis: ${error.message}`);
      this.useRedisPubSub = false;
    }
  }

  /**
   * Kirim notifikasi ke semua client
   * @param event Nama event
   * @param data Data yang dikirim
   * @param targetUserIds Array userIds yang menjadi target, jika kosong akan dikirim ke semua
   */
  sendToAll(event: string, data: any, targetUserIds: string[] = []) {
    // Jika ada target spesifik, kirim hanya ke mereka daripada broadcast ke semua
    if (targetUserIds.length > 0) {
      for (const userId of targetUserIds) {
        this.sendToUser(userId, event, data);
      }
      this.logger.debug(`Sent event "${event}" to ${targetUserIds.length} targeted users`);
      return;
    }

    // Gunakan Redis pub/sub jika diaktifkan dan tersedia
    if (this.useRedisPubSub && this.redisServiceAvailable) {
      try {
        // Periksa ulang apakah Redis masih terhubung
        if (!this.isRedisServiceAvailable()) {
          this.redisServiceAvailable = false;
          this.useRedisPubSub = false;
          // Fallback ke Socket.IO jika Redis tidak tersedia
          this.server.emit(event, data);
          this.logger.warn('Redis tidak tersedia, fallback ke direct broadcast.');
          return;
        }

        this.redisPubSubService.publish(event, data);
        this.logger.debug(`Broadcasting event "${event}" using Redis pub/sub`);
      } catch (error) {
        this.logger.error(`Redis pub/sub failed: ${error.message}`);
        // Fallback ke socket.io broadcast jika Redis gagal
        this.redisServiceAvailable = false;
        this.useRedisPubSub = false;
        this.server.emit(event, data);
      }
    } else {
      // Gunakan socket.io broadcast langsung
      try {
        this.server.emit(event, data);
        this.logger.debug(
          `Broadcasting event "${event}" to all clients (${this.totalConnections} connections)`,
        );
      } catch (error) {
        this.logger.error(`Socket.IO broadcast failed: ${error.message}`);
      }
    }
  }

  /**
   * Kirim notifikasi ke client tertentu berdasarkan userId
   */
  sendToUser(userId: string, event: string, data: any) {
    try {
      const client = this.clients.get(userId);
      if (client && client.connected) {
        client.emit(event, data);
        this.logger.debug(`Sent event "${event}" to user ${userId}`);
        return true;
      }
      this.logger.warn(
        `Failed to send notification to user ${userId}: client not found or disconnected`,
      );
      return false;
    } catch (error) {
      this.logger.error(`Error sending to user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Kirim update status queue/job ke semua client
   * @param targetUserIds Array userIds yang menjadi target, jika kosong akan dikirim ke semua
   */
  sendQueueUpdate(
    queueName: string,
    jobId: string,
    status: string,
    data: any = {},
    targetUserIds: string[] = [],
  ) {
    try {
      this.sendToAll(
        'queue:update',
        {
          queue: queueName,
          jobId,
          status,
          timestamp: new Date(),
          ...data,
        },
        targetUserIds,
      );
    } catch (error) {
      this.logger.error(`Error sending queue update: ${error.message}`);
    }
  }

  /**
   * Kirim notifikasi HTTP request selesai
   * @param targetUserIds Array userIds yang menjadi target, jika kosong akan dikirim ke semua
   */
  sendHttpRequestComplete(requestId: string, result: any, targetUserIds: string[] = []) {
    try {
      this.sendToAll(
        'http:complete',
        {
          requestId,
          timestamp: new Date(),
          result,
        },
        targetUserIds,
      );
    } catch (error) {
      this.logger.error(`Error sending HTTP request complete: ${error.message}`);
    }
  }

  /**
   * Dapatkan jumlah koneksi saat ini
   */
  getConnectionStats() {
    return {
      totalConnections: this.totalConnections,
      uniqueIps: this.ipConnections.size,
      maxTotalConnections: this.maxTotalConnections,
      usingRedisPubSub: this.useRedisPubSub,
      redisAvailable: this.redisServiceAvailable,
    };
  }
}
