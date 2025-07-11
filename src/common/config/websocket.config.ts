/**
 * Konfigurasi WebSocket untuk aplikasi
 * 
 * File ini berisi konfigurasi adapter Socket.IO untuk NestJS
 */
import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOptions } from './cors.config';
import { createWinstonLogger } from './logger.config';
import { ServerOptions } from 'socket.io';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * Custom adapter untuk Socket.IO yang terintegrasi dengan Fastify
 */
export class CustomIoAdapter extends IoAdapter {
  private readonly logger = createWinstonLogger('SocketAdapter');
  private app: NestFastifyApplication;

  constructor(app: NestFastifyApplication) {
    super(app);
    this.app = app;
  }

  /**
   * Membuat server Socket.IO dengan konfigurasi yang optimal
   * 
   * @param port - Port untuk server Socket.IO
   * @param options - Opsi konfigurasi Socket.IO
   * @returns Server Socket.IO yang dikonfigurasi
   */
  createIOServer(port: number, options?: ServerOptions): any {
    // Mendapatkan server HTTP dari Fastify
    const httpServer = this.app.getHttpAdapter().getHttpServer();
    
    const corsConfig = {
      origin: corsOptions.origin,
      methods: corsOptions.methods,
      credentials: true,
      allowedHeaders: corsOptions.allowedHeaders,
    };

    // Konfigurasi Socket.IO
    const socketIoOptions = {
      ...options,
      cors: corsConfig,
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      upgradeTimeout: 10000,
      cookie: false,
      path: '/socket.io',
    };

    // Buat server Socket.IO dengan server HTTP yang ada
    const io = require('socket.io')(httpServer, socketIoOptions);

    return io;
  }
} 