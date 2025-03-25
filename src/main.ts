import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true, // Enable CORS at application level
  });
  const configService = app.get(ConfigService);

  // Konfigurasi Winston Logger
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  });

  // Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Allow WebSocket connections
    }),
  );
  app.use(compression());
  app.use(morgan('combined'));

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // CORS dengan konfigurasi yang lebih permisif untuk WebSocket
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Rental Motor API')
    .setDescription(
      'API untuk aplikasi rental motor yang menyediakan layanan pengelolaan unit motor, transaksi sewa, dan administrasi.',
    )
    .setVersion('1.0')
    .addTag('Jenis Motor', 'Endpoint untuk mengelola jenis-jenis motor')
    .addTag('Unit Motor', 'Endpoint untuk mengelola unit motor yang tersedia')
    .addTag('Transaksi', 'Endpoint untuk mengelola transaksi rental motor')
    .addTag('Admin', 'Endpoint untuk manajemen admin')
    .addTag('Auth', 'Endpoint untuk autentikasi pengguna')
    .addTag('Blog', 'Endpoint untuk manajemen konten blog')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Masukkan token JWT dengan format: Bearer {token}',
    })
    .setContact(
      'Tim Rental Motor',
      'https://rentalmotor.example.com',
      'contact@rentalmotor.example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      persistAuthorization: true,
    },
    customSiteTitle: 'Rental Motor API Documentation',
  });

  // Start server
  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket test page: http://localhost:${port}/test-socket.html`);
}

bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
