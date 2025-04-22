import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';

/**
 * Konfigurasi CORS dan body parser untuk aplikasi
 * @param app Aplikasi NestJS
 */
export function setupCors(app: INestApplication): void {
  // Konfigurasi CORS yang lebih spesifik
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://rosantibikemotorent.com',
      'https://www.rosantibikemotorent.com',
      '*',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Konfigurasi body parser dengan limit yang lebih besar
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
}
