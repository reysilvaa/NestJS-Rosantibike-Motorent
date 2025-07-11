/**
 * BOOTSTRAP FASTIFY SERVER
 * 
 * File ini bertanggung jawab untuk inisialisasi dan menjalankan server Fastify.
 * Fokus utama adalah mempersiapkan dan menjalankan server HTTP.
 */
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

// Flag untuk menandai apakah server sudah berjalan
let isServerRunning = false;

/**
 * Persiapan Lingkungan Server
 * Memastikan direktori dan struktur yang dibutuhkan tersedia
 */
const setupEnvironment = (): void => {
  // Pastikan direktori logs ada
  const logDir = process.env.LOG_DIR || 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

/**
 * Membuat Fastify adapter dengan pengaturan optimal
 */
const createFastifyAdapter = (): FastifyAdapter => {
  return new FastifyAdapter({
    logger: false, // Gunakan logger NestJS
    bodyLimit: 10 * 1024 * 1024, // 10MB limit untuk request body
    ignoreTrailingSlash: true, // Abaikan trailing slash di routes
    caseSensitive: false, // Route tidak case sensitive
  });
};

/**
 * Konfigurasi plugin Fastify untuk penanganan file
 */
const configureFastifyPlugins = async (adapter: FastifyAdapter): Promise<void> => {
  // Konfigurasi multipart untuk upload file
  await adapter.register(fastifyMultipart as any, {
    limits: {
      fieldNameSize: 100, // Ukuran maksimal nama field dalam bytes
      fieldSize: 1024 * 1024, // Ukuran maksimal nilai field dalam bytes (1MB)
      fields: 10, // Jumlah maksimal field non-file
      fileSize: 5 * 1024 * 1024, // Ukuran maksimal file dalam bytes (5MB)
      files: 5, // Jumlah maksimal field file
    },
  });
};

/**
 * Konfigurasi akses file statis
 */
const configureStaticFiles = async (app: NestFastifyApplication): Promise<void> => {
  await app.register(fastifyStatic as any, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  });
};

/**
 * Membuat instance aplikasi NestJS dengan Fastify
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
 * FUNGSI BOOTSTRAP UTAMA
 * 
 * Menginisialisasi dan menjalankan server Fastify
 */
export async function bootstrap(): Promise<void> {
  // Cegah inisialisasi ganda
  if (isServerRunning) {
    console.log('Server sudah berjalan, menghindari inisialisasi ganda');
    return;
  }

  // Persiapkan lingkungan server
  setupEnvironment();

  // Gunakan logger terpusat
  const logger = createBootstrapLogger();
  
  try {
    logger.log('MEMULAI PROSES BOOTSTRAP SERVER FASTIFY');
    
    // TAHAP 1: PERSIAPAN SERVER FASTIFY
    logger.log('Tahap 1: Persiapan Fastify adapter');
    const fastifyAdapter = createFastifyAdapter();
    await configureFastifyPlugins(fastifyAdapter);
    
    // TAHAP 2: INISIALISASI APLIKASI DENGAN FASTIFY
    logger.log('Tahap 2: Inisialisasi aplikasi NestJS dengan Fastify');
    const app = await createNestApplication(fastifyAdapter, logger);
    const configService = app.get(ConfigService);

    // TAHAP 3: KONFIGURASI DASAR SERVER
    logger.log('Tahap 3: Konfigurasi dasar server');
    app.setGlobalPrefix('api');
    await configureStaticFiles(app);
    
    // TAHAP 4: KONFIGURASI FITUR APLIKASI (WebSocket, Swagger, dll)
    logger.log('Tahap 4: Menerapkan fitur aplikasi');
    await configureApplication(app, configService, logger);

    // TAHAP 5: MENJALANKAN SERVER
    logger.log('Tahap 5: Menjalankan server Fastify');
    const { server, port } = await configureServer(app, configService, logger);
    
    // TAHAP 6: KONFIGURASI SHUTDOWN YANG AMAN
    logger.log('Tahap 6: Konfigurasi graceful shutdown');
    configureShutdown(server, logger);
    
    // Tandai server sudah berjalan
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
