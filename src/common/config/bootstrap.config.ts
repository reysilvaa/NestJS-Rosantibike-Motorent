import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { createBootstrapLogger } from './logger.config';
import { configureServer, configureShutdown } from './server.config';
import { configureApplication } from './app.config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as fs from 'fs';
import * as path from 'path';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

let isServerRunning = false;

const setupEnvironment = (): void => {
  const logDir = process.env.LOG_DIR || 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

const createFastifyAdapter = (): FastifyAdapter => {
  return new FastifyAdapter({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
    ignoreTrailingSlash: true,
    caseSensitive: false,
  });
};

const configureFastifyPlugins = async (adapter: FastifyAdapter): Promise<void> => {
  await adapter.register(fastifyMultipart as any, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
      fields: 10,
      fileSize: 5 * 1024 * 1024,
      files: 5,
    },
  });
};

const configureStaticFiles = async (app: NestFastifyApplication): Promise<void> => {
  await app.register(fastifyStatic as any, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  });
};

const createNestApplication = async (
  fastifyAdapter: FastifyAdapter,
  logger: any,
): Promise<NestFastifyApplication> => {
  return await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    logger,
    bufferLogs: true,
  });
};

export async function bootstrap(): Promise<void> {
  if (isServerRunning) {
    console.log('Server sudah berjalan, menghindari inisialisasi ganda');
    return;
  }

  setupEnvironment();

  const logger = createBootstrapLogger();

  try {
    logger.log('MEMULAI PROSES BOOTSTRAP SERVER FASTIFY');

    logger.log('Tahap 1: Persiapan Fastify adapter');
    const fastifyAdapter = createFastifyAdapter();
    await configureFastifyPlugins(fastifyAdapter);

    logger.log('Tahap 2: Inisialisasi aplikasi NestJS dengan Fastify');
    const app = await createNestApplication(fastifyAdapter, logger);
    const configService = app.get(ConfigService);

    logger.log('Tahap 3: Konfigurasi dasar server');
    app.setGlobalPrefix('api');
    await configureStaticFiles(app);

    logger.log('Tahap 4: Menerapkan fitur aplikasi');
    await configureApplication(app, configService, logger);

    logger.log('Tahap 5: Menjalankan server Fastify');
    const { server, port } = await configureServer(app, configService, logger);

    logger.log('Tahap 6: Konfigurasi graceful shutdown');
    configureShutdown(server, logger);

    isServerRunning = true;

    logger.log(`SERVER FASTIFY BERHASIL DIJALANKAN`);
    logger.log(`Server berjalan di http://localhost:${port}`);
    logger.log(`Dokumentasi API tersedia di http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.error(`KEGAGALAN BOOTSTRAP SERVER: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}
