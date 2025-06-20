import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger, Inject, Optional } from '@nestjs/common';
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

  private ipConnections: Map<string, Set<string>> = new Map();
  private readonly maxConnectionsPerIp = 20;

  private totalConnections = 0;
  private readonly maxTotalConnections = 100;
  private readonly minTotalConnections = 20;

  private readonly redisPubSubThreshold = 200;

  private useRedisPubSub = false;
  private redisServiceAvailable = false;

  constructor(@Optional() @Inject('REDIS_PUB_SUB_SERVICE') private redisPubSubService?: any) {
    if (this.redisPubSubService) {
      try {
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

  private isRedisServiceAvailable(): boolean {
    try {
      if (!this.redisPubSubService) return false;

      if (typeof this.redisPubSubService.isConnected === 'function') {
        return this.redisPubSubService.isConnected();
      }

      if (this.redisPubSubService.client && this.redisPubSubService.client.status === 'ready') {
        return true;
      }

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

    const ipSocketIds = this.ipConnections.get(clientIp as string) || new Set();

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

    ipSocketIds.add(client.id);
    this.ipConnections.set(clientIp as string, ipSocketIds);

    this.totalConnections++;

    this.updateRedisPubSubUsage();

    if (userId) {
      this.clients.set(userId, client);
      this.logger.log(`Client connected: ${client.id}, userId: ${userId}, IP: ${clientIp}`);
    } else {
      this.logger.log(`Client connected: ${client.id}, no userId, IP: ${clientIp}`);
    }

    client.emit('connected', {
      status: 'connected',
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });

    const pingInterval = setInterval(() => {
      if (client.connected) {
        client.emit('ping', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(pingInterval);
      }
    }, 15_000);

    client.data.pingInterval = pingInterval;
  }

  handleDisconnect(client: Socket) {
    if (client.data.pingInterval) {
      clearInterval(client.data.pingInterval);
    }

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

    for (const [userId, socket] of this.clients.entries()) {
      if (socket.id === client.id) {
        this.clients.delete(userId);
        this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
        break;
      }
    }

    this.totalConnections--;

    this.updateRedisPubSubUsage();

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private updateRedisPubSubUsage() {
    if (!this.redisServiceAvailable) {
      this.useRedisPubSub = false;
      return;
    }

    try {
      this.redisServiceAvailable = this.isRedisServiceAvailable();
      if (!this.redisServiceAvailable) {
        this.useRedisPubSub = false;
        this.logger.warn('Redis service terputus. Beralih ke direct broadcast.');
        return;
      }

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

  sendToAll(event: string, data: any, targetUserIds: string[] = []) {
    if (targetUserIds.length > 0) {
      for (const userId of targetUserIds) {
        this.sendToUser(userId, event, data);
      }
      this.logger.debug(`Sent event "${event}" to ${targetUserIds.length} targeted users`);
      return;
    }

    if (this.useRedisPubSub && this.redisServiceAvailable) {
      try {
        if (!this.isRedisServiceAvailable()) {
          this.redisServiceAvailable = false;
          this.useRedisPubSub = false;

          this.server.emit(event, data);
          this.logger.warn('Redis tidak tersedia, fallback ke direct broadcast.');
          return;
        }

        this.redisPubSubService.publish(event, data);
        this.logger.debug(`Broadcasting event "${event}" using Redis pub/sub`);
      } catch (error) {
        this.logger.error(`Redis pub/sub failed: ${error.message}`);

        this.redisServiceAvailable = false;
        this.useRedisPubSub = false;
        this.server.emit(event, data);
      }
    } else {
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
