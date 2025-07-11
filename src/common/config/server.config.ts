/**
 * Konfigurasi server aplikasi
 * 
 * File ini berisi konfigurasi untuk menjalankan server dan menangani shutdown
 */
import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { LoggerService } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as fs from 'fs';
import * as path from 'path';

// Simpan port yang berhasil digunakan untuk mencegah inisialisasi berulang
let lastSuccessfulPort: number | null = null;

/**
 * Memeriksa apakah port tersedia
 * @param port - Port yang akan diperiksa
 * @returns Promise<boolean> - true jika port tersedia, false jika tidak
 */
const isPortAvailable = (port: number): Promise<boolean> => {
  const net = require('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
};

/**
 * Mencoba port alternatif jika port default sudah digunakan
 * @param app - Aplikasi NestJS
 * @param basePort - Port awal yang akan dicoba
 * @param host - Host untuk menjalankan server
 * @param logger - Logger service
 * @param maxAttempts - Jumlah maksimum percobaan
 * @returns Port yang tersedia
 */
const findAvailablePort = async (
  app: NestFastifyApplication,
  basePort: number,
  host: string,
  logger: LoggerService,
  maxAttempts: number = 5
): Promise<number> => {
  // Jika sebelumnya sudah berhasil menggunakan port tertentu, coba gunakan port itu terlebih dahulu
  if (lastSuccessfulPort) {
    logger.log(`Mencoba menggunakan port terakhir yang berhasil: ${lastSuccessfulPort}`);
    if (await isPortAvailable(lastSuccessfulPort)) {
      try {
        await app.listen(lastSuccessfulPort, host);
        logger.log(`Server berhasil berjalan pada port ${lastSuccessfulPort}`);
        return lastSuccessfulPort;
      } catch (error) {
        logger.warn(`Gagal menggunakan port terakhir: ${error.message}`);
        // Lanjutkan dengan port baru
      }
    }
  }

  let currentPort = basePort;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Periksa terlebih dahulu apakah port tersedia sebelum mencoba listen
    if (await isPortAvailable(currentPort)) {
      try {
        await app.listen(currentPort, host);
        logger.log(`Server berhasil berjalan pada port ${currentPort}`);
        // Simpan port yang berhasil digunakan
        lastSuccessfulPort = currentPort;
        return currentPort;
      } catch (error) {
        logger.warn(`Gagal menjalankan server pada port ${currentPort}: ${error.message}`);
      }
    } else {
      logger.warn(`Port ${currentPort} sudah digunakan`);
    }
    
    attempts++;
    currentPort++;
    logger.warn(`Mencoba port ${currentPort}...`);
  }

  throw new Error(`Tidak dapat menemukan port yang tersedia setelah ${maxAttempts} percobaan`);
};

/**
 * Konfigurasi dan menjalankan server aplikasi
 * 
 * @param app - Instance aplikasi NestJS dengan Fastify
 * @param configService - Service konfigurasi
 * @param logger - Service logger
 * @returns Object berisi instance server dan port yang digunakan
 */
export const configureServer = async (
  app: NestFastifyApplication,
  configService: ConfigService,
  logger: LoggerService,
): Promise<{ server: any; port: number }> => {
  // Coba ambil port dari environment variable atau gunakan default
  const basePort = configService.get<number>('PORT', Number(process.env.PORT) || 3000);
  const host = '0.0.0.0';
  
  // Pastikan semua rute terdaftar sebelum menjalankan server
  await app.init();
  
  // Fastify menggunakan metode listen yang berbeda
  const fastifyInstance = app.getHttpAdapter().getInstance();
  
  try {
    // Coba jalankan server dengan penanganan port yang sudah digunakan
    const port = await findAvailablePort(app, basePort, host, logger);
    
    return { server: fastifyInstance, port };
  } catch (error) {
    logger.error(`Gagal menjalankan server: ${error.message}`);
    throw error;
  }
};

/**
 * Konfigurasi graceful shutdown untuk server
 * 
 * @param server - Instance server HTTP
 * @param logger - Service logger
 */
export const configureShutdown = (server: any, logger: LoggerService): void => {
  const signals = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.log(`Menerima sinyal ${signal}, melakukan shutdown secara graceful`);

      server.close(() => {
        logger.log('Server HTTP berhasil ditutup');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Shutdown paksa setelah timeout');
        process.exit(1);
      }, 10_000);
    });
  }
};
