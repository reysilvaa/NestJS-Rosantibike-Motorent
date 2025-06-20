import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOptions } from '../config/cors.config';

export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: corsOptions,
      pingTimeout: 60_000,
      pingInterval: 25_000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      upgradeTimeout: 10_000,
      cookie: false,
    });
    return server;
  }
}
