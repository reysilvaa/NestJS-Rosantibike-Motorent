import { createWinstonLogger } from './logger.config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

const logger = createWinstonLogger('CorsConfig');

export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [
          `http://localhost:${process.env.PORT}`,
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:3000',
          'https://admin.rosantibikemotorent.com',
          'https://rosantibikemotorent.com',
          'https://www.rosantibikemotorent.com',
          'https://api.rosantibikemotorent.com',
          'https://wa.rosantibikemotorent.com',
        ];

    if (!origin) {
      return callback(null, true);
    }

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

export function configureCors(app: NestFastifyApplication): void {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.log(`Mengatur CORS untuk lingkungan: ${isProduction ? 'production' : 'development'}`);

  app.enableCors(corsOptions);
}
