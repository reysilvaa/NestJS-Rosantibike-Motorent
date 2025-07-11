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

export const configureApplication = async (
  app: NestFastifyApplication,
  configService: ConfigService,
  logger: any,
): Promise<void> => {
  logger.log('Menerapkan fitur lanjutan aplikasi');

  configureGlobalValidation(app);

  await configureMiddleware(app);

  configureCors(app);

  logger.log('Menerapkan WebSocket adapter');
  const ioAdapter = new CustomIoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);

  logger.log('Menerapkan dokumentasi Swagger');
  configureSwagger(app);

  logger.log('Fitur lanjutan aplikasi berhasil diterapkan');
};

export const configureMiddleware = async (app: NestFastifyApplication): Promise<void> => {
  appLogger.log('Menerapkan middleware keamanan dan optimasi');

  await app.register(helmet as any, {
    crossOriginResourcePolicy: false,
  });

  await app.register(compress as any);

  appLogger.log('Middleware keamanan dan optimasi berhasil diterapkan');
};

export const configureGlobalValidation = (app: INestApplication): void => {
  appLogger.log('Menerapkan aturan validasi global');

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

  appLogger.log('Aturan validasi global berhasil diterapkan');
};

export const configureGlobalPipes = configureGlobalValidation;
