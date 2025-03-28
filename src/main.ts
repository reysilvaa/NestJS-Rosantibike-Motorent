import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  configureMiddleware,
  configureStaticAssets,
  configureCors,
  configureGlobalPipes,
  configureSwagger,
  startServer,
  configureShutdown,
  createLogger,
} from './common/config';
import { setupCluster } from './cluster';

async function bootstrap() {
  // Inisialisasi aplikasi
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bufferLogs: true,
  });

  // Inisialisasi logger
  const logger = createLogger();
  app.useLogger(logger);

  // Dapatkan config service
  const configService = app.get(ConfigService);

  // Konfigurasi aplikasi
  configureMiddleware(app);
  configureStaticAssets(app);
  configureCors(app);
  configureGlobalPipes(app);
  configureSwagger(app);

  // Jalankan server
  const { server, port } = await startServer(app, configService, new Logger('Bootstrap'));

  // Konfigurasi shutdown handler
  configureShutdown(server, new Logger('Bootstrap'));

  // Log informasi server
  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
  Logger.log(`WebSocket test page: http://localhost:${port}/test-socket.html`);
  Logger.log(`Realtime test page: http://localhost:${port}/test-realtime.html`);
}

// Gunakan cluster jika NODE_ENV adalah production dan tidak dalam mode PM2 (PM2 sudah menangani clustering)
if (process.env.NODE_ENV === 'production' && !process.env.PM2_HOME) {
  setupCluster(bootstrap);
} else {
  bootstrap().catch(error => {
    Logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  });
}
