import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Mengonfigurasi middleware aplikasi
 */
export const configureMiddleware = (app: INestApplication): void => {
  // Helmet untuk keamanan header HTTP
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Izinkan koneksi WebSocket
    }),
  );

  // Kompresi respons
  app.use(compression());

  // Logging HTTP
  app.use(morgan('combined'));
};

/**
 * Mengonfigurasi static file serving
 */
export const configureStaticAssets = (app: NestExpressApplication): void => {
  app.useStaticAssets(join(__dirname, '..', '..', '..', 'public'));
};

/**
 * Mengonfigurasi CORS
 */
export const configureCors = (app: INestApplication): void => {
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });
};

/**
 * Mengonfigurasi global pipes
 */
export const configureGlobalPipes = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
};

/**
 * Mengonfigurasi Swagger untuk dokumentasi API
 */
export const configureSwagger = (app: INestApplication): void => {
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
};
