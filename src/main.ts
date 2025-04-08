import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

/**
 * Class yang memperluas IoAdapter untuk konfigurasi Socket.IO
 */
export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          'http://localhost:3001',
          'http://localhost:3000',
          'https://rosantibikemotorent.com',
          'https://api.rosantibikemotorent.com',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
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

/**
 * Bootstrap aplikasi dengan konfigurasi minimal
 */
async function bootstrap() {
  try {
    // Buat aplikasi dengan konfigurasi dasar
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      cors: true,
      bodyParser: true,
    });

    // Konfigurasi CORS yang lebih spesifik
    app.enableCors({
      origin: [
        'http://localhost:3001',
        'http://localhost:3000',
        'https://rosantibikemotorent.com',
        'https://api.rosantibikemotorent.com',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      credentials: true,
      maxAge: 3600,
    });

    // Konfigurasi adapter WebSocket
    app.useWebSocketAdapter(new CustomIoAdapter(app));

    // Konfigurasi Swagger
    const config = new DocumentBuilder()
      .setTitle('Rental Motor API')
      .setDescription('API untuk sistem rental motor')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Ambil port dari config service
    const configService = app.get(ConfigService);
    const port = configService.get('PORT', 3030);

    // Jalankan aplikasi
    await app.listen(port);
    Logger.log(`Aplikasi berjalan di http://localhost:${port}`);
    Logger.log(`Dokumentasi API tersedia di http://localhost:${port}/api/docs`);
  } catch (error) {
    Logger.error(`Error saat menjalankan aplikasi: ${error.message}`);
    Logger.error(error.stack);
  }
}

bootstrap();
