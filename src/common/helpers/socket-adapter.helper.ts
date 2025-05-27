import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOptions } from '../config/cors.config';

/**
 * Class yang memperluas IoAdapter untuk konfigurasi Socket.IO
 */
export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: corsOptions,
      pingTimeout: 60_000, // Waktu timeout ping: 60 detik
      pingInterval: 25_000, // Interval ping: 25 detik
      transports: ['websocket', 'polling'], // Support polling sebagai fallback
      allowUpgrades: true,
      upgradeTimeout: 10_000,
      cookie: false,
    });
    return server;
  }
}
