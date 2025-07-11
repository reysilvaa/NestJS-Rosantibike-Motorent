/**
 * KONFIGURASI UTAMA APLIKASI
 * 
 * File ini berisi semua konfigurasi komponen aplikasi yang bersifat global
 * dan pengaturan fitur lanjutan seperti WebSocket, Swagger, dll.
 */
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { createWinstonLogger } from './logger.config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { ConfigService } from '@nestjs/config';
import { CustomIoAdapter } from './websocket.config';
import { configureSwagger } from './swagger.config';
import { configureCors } from './cors.config';

const appLogger = createWinstonLogger('AppConfig');

/**
 * Konfigurasi fitur lanjutan aplikasi
 * 
 * Fungsi ini menerapkan semua fitur lanjutan aplikasi seperti
 * WebSocket, Swagger, CORS, dan middleware keamanan
 * 
 * @param app - Instance aplikasi NestJS
 * @param configService - Service konfigurasi untuk mengakses variabel lingkungan
 * @param logger - Logger untuk mencatat proses konfigurasi
 */
export const configureApplication = async (
  app: NestFastifyApplication, 
  configService: ConfigService,
  logger: any
): Promise<void> => {
  logger.log('Menerapkan fitur lanjutan aplikasi');
  
  // Terapkan validasi global
  configureGlobalValidation(app);
  
  // Terapkan middleware keamanan dan optimasi
  await configureMiddleware(app);
  
  // Konfigurasi CORS
  configureCors(app);
  
  // Konfigurasi WebSocket
  logger.log('Menerapkan WebSocket adapter');
  const ioAdapter = new CustomIoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);
  
  // Konfigurasi Swagger API docs
  logger.log('Menerapkan dokumentasi Swagger');
  configureSwagger(app);
  
  logger.log('Fitur lanjutan aplikasi berhasil diterapkan');
};

/**
 * Konfigurasi keamanan dan optimasi HTTP
 * 
 * Menerapkan middleware untuk keamanan dan performa
 * 
 * @param app - Instance aplikasi NestJS dengan Fastify
 */
export const configureMiddleware = async (app: NestFastifyApplication): Promise<void> => {
  appLogger.log('Menerapkan middleware keamanan dan optimasi');
  
  // Keamanan: Helmet untuk proteksi header HTTP
  await app.register(helmet as any, {
    crossOriginResourcePolicy: false,
  });
  
  // Optimasi: Kompresi respons HTTP
  await app.register(compress as any);
  
  appLogger.log('Middleware keamanan dan optimasi berhasil diterapkan');
};

/**
 * Konfigurasi validasi global
 * 
 * Menerapkan aturan validasi untuk semua request masuk
 * 
 * @param app - Instance aplikasi NestJS
 */
export const configureGlobalValidation = (app: INestApplication): void => {
  appLogger.log('Menerapkan aturan validasi global');
  
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
  
  appLogger.log('Aturan validasi global berhasil diterapkan');
};

// Ekspor fungsi lama untuk kompatibilitas
export const configureGlobalPipes = configureGlobalValidation;