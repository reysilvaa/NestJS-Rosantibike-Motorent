/**
 * Konfigurasi utama aplikasi
 * 
 * File ini berisi konfigurasi middleware dan global pipes untuk aplikasi NestJS
 */
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { createWinstonLogger } from './logger.config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';

const appLogger = createWinstonLogger('AppConfig');

/**
 * Konfigurasi middleware aplikasi
 * 
 * @param app - Instance aplikasi NestJS dengan Fastify
 */
export const configureMiddleware = async (app: NestFastifyApplication): Promise<void> => {
  appLogger.log('Mengonfigurasi middleware aplikasi');
  
  // Step 1: Registrasi Helmet untuk keamanan HTTP header
  await app.register(helmet as any, {
    crossOriginResourcePolicy: false,
  });
  
  // Step 2: Registrasi Compress untuk kompresi respons
  await app.register(compress as any);
  
  appLogger.log('Middleware aplikasi berhasil dikonfigurasi');
};

/**
 * Konfigurasi global pipes untuk validasi
 * 
 * @param app - Instance aplikasi NestJS
 */
export const configureGlobalPipes = (app: INestApplication): void => {
  appLogger.log('Mengonfigurasi global pipes untuk validasi');
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Hapus properti yang tidak terdefinisi di DTO
      transform: true, // Transform payload ke instance DTO
      forbidNonWhitelisted: true, // Tolak request dengan properti yang tidak terdefinisi
      transformOptions: {
        enableImplicitConversion: true, // Konversi tipe data secara implisit
        enableCircularCheck: true, // Cek referensi sirkular
      },
    }),
  );
};
