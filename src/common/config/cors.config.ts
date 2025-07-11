/**
 * Konfigurasi CORS untuk aplikasi
 */
import type { INestApplication } from '@nestjs/common';
import { createWinstonLogger } from './logger.config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

const logger = createWinstonLogger('CorsConfig');

/**
 * Opsi konfigurasi CORS untuk aplikasi
 */
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [
          `http://localhost:${process.env.PORT}`, // local backend
          'http://localhost:3001', // local frontend
          'http://localhost:3002', // local frotend admin
          'http://localhost:3000',
          'https://admin.rosantibikemotorent.com',
          'https://rosantibikemotorent.com',
          'https://www.rosantibikemotorent.com',
          'https://api.rosantibikemotorent.com',
          'https://wa.rosantibikemotorent.com',
        ];

    // Selalu izinkan permintaan tanpa origin (seperti dari Postman atau curl)
    if (!origin) {
      return callback(null, true);
    }

    // Izinkan semua origin dalam mode development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (
      origin.includes('rosantibikemotorent.com') ||
      allowedOrigins.includes(origin) ||
      origin === `http://localhost:${process.env.PORT}`
    ) {
      return callback(null, true);
    } else {
      logger.warn(`Origin tidak diizinkan: ${origin}`);
      return callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

/**
 * Mengonfigurasi CORS untuk aplikasi
 * 
 * @param app - Instance aplikasi NestJS dengan Fastify
 */
export function configureCors(app: NestFastifyApplication): void {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.log(`Mengatur CORS untuk lingkungan: ${isProduction ? 'production' : 'development'}`);

  // Registrasi CORS plugin untuk Fastify
  app.enableCors(corsOptions);
}
