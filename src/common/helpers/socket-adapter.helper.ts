import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOptions } from '../config/cors.config';
import { Logger } from '@nestjs/common';

export class CustomIoAdapter extends IoAdapter {
  private readonly logger = new Logger(CustomIoAdapter.name);

  createIOServer(port: number, options?: any): any {
    this.logger.log(`Membuat server Socket.IO di port ${port}`);

    const corsConfig = {
      origin: corsOptions.origin,
      methods: corsOptions.methods,
      credentials: true,
      allowedHeaders: corsOptions.allowedHeaders,
    };

    this.logger.log(`Konfigurasi CORS untuk Socket.IO: ${JSON.stringify(corsConfig)}`);

    const server = super.createIOServer(port, {
      ...options,
      cors: corsConfig,
      pingTimeout: 60_000,
      pingInterval: 25_000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      upgradeTimeout: 10_000,
      cookie: false,
    });

    this.logger.log('Server Socket.IO berhasil dibuat');
    return server;
  }
}
