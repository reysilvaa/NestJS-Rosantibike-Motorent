import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('CorsConfig');

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

    logger.log(`Memeriksa origin: ${origin || 'no origin'}`);

    // Selalu izinkan permintaan tanpa origin (seperti dari Postman atau curl)
    if (!origin) {
      logger.log('Mengizinkan permintaan tanpa origin');
      return callback(null, true);
    }

    // Izinkan semua origin dalam mode development
    if (process.env.NODE_ENV !== 'production') {
      logger.log(`Mode development: Mengizinkan semua origin: ${origin}`);
      return callback(null, true);
    }

    if (
      origin.includes('rosantibikemotorent.com') ||
      allowedOrigins.includes(origin) ||
      origin === `http://localhost:${process.env.PORT}`
    ) {
      logger.log(`Origin diizinkan: ${origin}`);
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

export function setupCors(app: INestApplication): void {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.log(`Mengatur CORS untuk lingkungan: ${isProduction ? 'production' : 'development'}`);

  app.enableCors(corsOptions);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
}
