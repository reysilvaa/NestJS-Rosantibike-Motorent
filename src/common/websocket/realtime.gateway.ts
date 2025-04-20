import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      this.clients.set(userId, client);
      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
    } else {
      this.logger.log(`Client connected: ${client.id}, no userId`);
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

    // Mencari dan menghapus klien dari map clients
    for (const [userId, socket] of this.clients.entries()) {
      if (socket.id === client.id) {
        this.clients.delete(userId);
        this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
        break;
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Kirim notifikasi ke semua client
   */
  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcasting event "${event}" to all clients`);
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
   */
  sendQueueUpdate(queueName: string, jobId: string, status: string, data: any = {}) {
    this.sendToAll('queue:update', {
      queue: queueName,
      jobId,
      status,
      timestamp: new Date(),
      ...data,
    });
  }

  /**
   * Kirim notifikasi HTTP request selesai
   */
  sendHttpRequestComplete(requestId: string, result: any) {
    this.sendToAll('http:complete', {
      requestId,
      timestamp: new Date(),
      result,
    });
  }
}
