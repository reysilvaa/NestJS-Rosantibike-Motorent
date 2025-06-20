import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import helmet from 'helmet';
import * as morgan from 'morgan';
import * as cookieParser from 'cookie-parser';
import { join } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

export const configureMiddleware = (app: INestApplication): void => {
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cookieParser());

  app.use(compression());

  app.use(morgan('combined'));
};

export const configureStaticAssets = (app: NestExpressApplication): void => {
  app.useStaticAssets(join(__dirname, '..', '..', '..', 'public'));
};

export const configureGlobalPipes = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
        enableCircularCheck: true,
      },
    }),
  );
};

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
