import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createWinstonLogger } from './logger.config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

const logger = createWinstonLogger('SwaggerConfig');

export function configureSwagger(app: NestFastifyApplication): void {
  logger.log('Mengonfigurasi Swagger API documentation');

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
}
