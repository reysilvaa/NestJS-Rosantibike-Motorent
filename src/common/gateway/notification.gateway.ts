import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

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
  }

  handleDisconnect(client: Socket) {
    // Find and remove the disconnected client
    for (const [userId, socket] of this.clients.entries()) {
      if (socket.id === client.id) {
        this.clients.delete(userId);
        this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
        break;
      }
    }
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

    if (client) {
      client.emit(event, data);
      this.logger.debug(`Sent event "${event}" to user ${userId}`);
      return true;
    } else {
      this.logger.debug(`Failed to send event "${event}": User ${userId} not connected`);
      return false;
    }
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
