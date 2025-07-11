import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOptions } from './cors.config';
import { createWinstonLogger } from './logger.config';
import { ServerOptions } from 'socket.io';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export class CustomIoAdapter extends IoAdapter {
  private readonly logger = createWinstonLogger('SocketAdapter');
  private app: NestFastifyApplication;

  constructor(app: NestFastifyApplication) {
    super(app);
    this.app = app;
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const httpServer = this.app.getHttpAdapter().getHttpServer();

    const corsConfig = {
      origin: corsOptions.origin,
      methods: corsOptions.methods,
      credentials: true,
      allowedHeaders: corsOptions.allowedHeaders,
    };

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

    const io = require('socket.io')(httpServer, socketIoOptions);

    return io;
  }
}
