import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { LoggerService } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as fs from 'fs';
import * as path from 'path';

let lastSuccessfulPort: number | null = null;

const isPortAvailable = (port: number): Promise<boolean> => {
  const net = require('net');
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
};

const findAvailablePort = async (
  app: NestFastifyApplication,
  basePort: number,
  host: string,
  logger: LoggerService,
  maxAttempts: number = 5,
): Promise<number> => {
  if (lastSuccessfulPort) {
    logger.log(`Mencoba menggunakan port terakhir yang berhasil: ${lastSuccessfulPort}`);
    if (await isPortAvailable(lastSuccessfulPort)) {
      try {
        await app.listen(lastSuccessfulPort, host);
        logger.log(`Server berhasil berjalan pada port ${lastSuccessfulPort}`);
        return lastSuccessfulPort;
      } catch (error) {
        logger.warn(`Gagal menggunakan port terakhir: ${error.message}`);
      }
    }
  }

  let currentPort = basePort;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (await isPortAvailable(currentPort)) {
      try {
        await app.listen(currentPort, host);
        logger.log(`Server berhasil berjalan pada port ${currentPort}`);

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

export const configureServer = async (
  app: NestFastifyApplication,
  configService: ConfigService,
  logger: LoggerService,
): Promise<{ server: any; port: number }> => {
  const basePort = configService.get<number>('PORT', Number(process.env.PORT) || 3000);
  const host = '0.0.0.0';

  await app.init();

  const fastifyInstance = app.getHttpAdapter().getInstance();

  try {
    const port = await findAvailablePort(app, basePort, host, logger);

    return { server: fastifyInstance, port };
  } catch (error) {
    logger.error(`Gagal menjalankan server: ${error.message}`);
    throw error;
  }
};

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
