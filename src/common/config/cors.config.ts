import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('CorsConfig');

export const corsOptions = {
  origin: (origin, callback) => {
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
          'https://wa.rosantibikemotorent.com',
        ];

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      logger.warn(`Origin tidak diizinkan: ${origin}`);
      callback(null, false);
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
