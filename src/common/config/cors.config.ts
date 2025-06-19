import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('CorsConfig');

/**
 * Konfigurasi CORS untuk aplikasi
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Ambil daftar origin dari variabel lingkungan jika tersedia
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [
          'http://localhost:3001',
          'http://localhost:3000',
          'http://localhost:3002',
          'http://localhost:3030',
          'https://admin.rosantibikemotorent.com',
          'https://rosantibikemotorent.com',
          'https://www.rosantibikemotorent.com',
          'https://api.rosantibikemotorent.com',
        ];
    
    // Untuk pengembangan, izinkan permintaan tanpa origin (misalnya dari Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      logger.log(`Origin diizinkan: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`Origin ditolak: ${origin}`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

/**
 * Konfigurasi CORS dan body parser untuk aplikasi
 * @param app Aplikasi NestJS
 */
export function setupCors(app: INestApplication): void {
  // Log environment
  const isProduction = process.env.NODE_ENV === 'production';
  logger.log(`Mengatur CORS untuk lingkungan: ${isProduction ? 'production' : 'development'}`);
  
  // Konfigurasi CORS yang lebih spesifik
  app.enableCors(corsOptions);

  // Konfigurasi body parser dengan limit yang lebih besar
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
}
