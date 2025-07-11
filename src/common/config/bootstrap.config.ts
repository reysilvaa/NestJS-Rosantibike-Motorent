import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { CustomIoAdapter } from './websocket.config';
import { configureSwagger } from './swagger.config';
import { configureCors } from './cors.config';
import { createBootstrapLogger } from './logger.config';
import { configureMiddleware, configureGlobalPipes } from './app.config';
import { configureServer, configureShutdown } from './server.config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as fs from 'fs';
import * as path from 'path';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

// Flag untuk menandai apakah aplikasi sudah berjalan
let isApplicationRunning = false;

// Memastikan direktori logs ada
const ensureLogDir = (logDir: string): void => {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

/**
 * Konfigurasi Fastify adapter dengan pengaturan yang optimal
 */
const createFastifyAdapter = (): FastifyAdapter => {
  return new FastifyAdapter({
    logger: false, // Gunakan logger NestJS
    bodyLimit: 10 * 1024 * 1024, // 10MB limit untuk request body
    ignoreTrailingSlash: true, // Ignore trailing slashes in routes
    caseSensitive: false, // Case insensitive routes
  });
};

/**
 * Konfigurasi plugin untuk Fastify
 */
const configureFastifyPlugins = async (adapter: FastifyAdapter): Promise<void> => {
  // Konfigurasi multipart untuk upload file
  await adapter.register(fastifyMultipart as any, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 1024 * 1024, // Max field value size in bytes (1MB)
      fields: 10, // Max number of non-file fields
      fileSize: 5 * 1024 * 1024, // Max file size in bytes (5MB)
      files: 5, // Max number of file fields
    },
  });
};

/**
 * Konfigurasi static file serving
 */
const configureStaticAssets = async (app: NestFastifyApplication): Promise<void> => {
  await app.register(fastifyStatic as any, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  });
};

/**
 * Inisialisasi aplikasi NestJS dengan Fastify
 */
const createNestApplication = async (
  fastifyAdapter: FastifyAdapter,
  logger: any
): Promise<NestFastifyApplication> => {
  return await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      logger,
      bufferLogs: true,
    }
  );
};

/**
 * Bootstrap aplikasi NestJS
 * Fungsi utama untuk menginisialisasi dan menjalankan aplikasi
 */
export async function bootstrap(): Promise<void> {
  // Jika aplikasi sudah berjalan, jangan inisialisasi ulang
  if (isApplicationRunning) {
    console.log('Aplikasi sudah berjalan, menghindari inisialisasi ganda');
    return;
  }

  // Pastikan direktori logs ada
  const logDir = process.env.LOG_DIR || 'logs';
  ensureLogDir(path.resolve(process.cwd(), logDir));

  // Gunakan logger terpusat
  const logger = createBootstrapLogger();
  
  try {
    logger.log('Memulai proses bootstrap aplikasi');
    
    // Step 1: Buat dan konfigurasi Fastify adapter
    const fastifyAdapter = createFastifyAdapter();
    await configureFastifyPlugins(fastifyAdapter);
    
    // Step 2: Buat aplikasi NestJS dengan Fastify
    const app = await createNestApplication(fastifyAdapter, logger);

    // Step 3: Konfigurasi aplikasi
    app.setGlobalPrefix('api');
    configureGlobalPipes(app);
    configureCors(app);
    await configureStaticAssets(app);
    await configureMiddleware(app);
    
    // Step 4: Konfigurasi WebSocket
    const ioAdapter = new CustomIoAdapter(app);
    app.useWebSocketAdapter(ioAdapter);

    // Step 5: Konfigurasi Swagger API docs
    configureSwagger(app);

    // Step 6: Mulai server
    logger.log('Memulai server aplikasi');
    const configService = app.get(ConfigService);
    const { server, port } = await configureServer(app, configService, logger);
    
    // Step 7: Konfigurasi graceful shutdown
    configureShutdown(server, logger);
    
    // Tandai aplikasi sudah berjalan
    isApplicationRunning = true;
    
    logger.log(`Aplikasi berjalan di http://localhost:${port}`);
    logger.log(`Dokumentasi API tersedia di http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.error(`Error saat menjalankan aplikasi: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}
