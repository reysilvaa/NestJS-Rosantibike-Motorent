import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger, Injectable, Inject, Optional } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000', '*'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 60_000,
  allowUpgrades: true,
  upgradeTimeout: 10_000,
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
  private readonly maxTotalConnections = 50; // Batas maksimum koneksi total
  private readonly minTotalConnections = 20; // Batas minimum koneksi total

  // Threshold untuk Redis pub/sub
  private readonly redisPubSubThreshold = 200;

  // Flag untuk menunjukkan apakah Redis digunakan
  private useRedisPubSub = false;

  constructor(@Optional() @Inject('REDIS_PUB_SUB_SERVICE') private redisPubSubService?: any) {
    // Inisialisasi Redis pub/sub jika tersedia
    if (this.redisPubSubService) {
      this.useRedisPubSub = true;
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

    // Setup interval ping untuk mencegah terputus
    const pingInterval = setInterval(() => {
      if (client.connected) {
        client.emit('ping', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(pingInterval);
      }
    }, 20_000);

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
    if (!this.redisPubSubService) return;

    // Gunakan Redis hanya jika koneksi < 200
    const shouldUseRedis = this.totalConnections < this.redisPubSubThreshold;

    if (shouldUseRedis !== this.useRedisPubSub) {
      this.useRedisPubSub = shouldUseRedis;
      this.logger.log(
        `Redis pub/sub ${this.useRedisPubSub ? 'diaktifkan' : 'dinonaktifkan'} (Koneksi: ${this.totalConnections})`,
      );
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
    if (this.useRedisPubSub && this.redisPubSubService) {
      try {
        this.redisPubSubService.publish(event, data);
        this.logger.debug(`Broadcasting event "${event}" using Redis pub/sub`);
      } catch (error) {
        this.logger.error(`Redis pub/sub failed: ${error.message}`);
        // Fallback ke socket.io broadcast jika Redis gagal
        this.server.emit(event, data);
      }
    } else {
      // Gunakan socket.io broadcast langsung
      this.server.emit(event, data);
      this.logger.debug(
        `Broadcasting event "${event}" to all clients (${this.totalConnections} connections)`,
      );
    }
  }

  /**
   * Kirim notifikasi ke client tertentu berdasarkan userId
   */
  sendToUser(userId: string, event: string, data: any) {
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
  }

  /**
   * Kirim notifikasi HTTP request selesai
   * @param targetUserIds Array userIds yang menjadi target, jika kosong akan dikirim ke semua
   */
  sendHttpRequestComplete(requestId: string, result: any, targetUserIds: string[] = []) {
    this.sendToAll(
      'http:complete',
      {
        requestId,
        timestamp: new Date(),
        result,
      },
      targetUserIds,
    );
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
    };
  }
}
