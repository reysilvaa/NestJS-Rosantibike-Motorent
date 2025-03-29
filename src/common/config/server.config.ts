import type { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';

/**
 * Fungsi untuk menjalankan server HTTP
 */
export const startServer = async (
  app: INestApplication,
  configService: ConfigService,
  logger: Logger,
): Promise<{ server: Server; port: number }> => {
  const port = configService.get<number>('PORT', 3000);
  const server = await app.listen(port, '0.0.0.0');
  
  logger.log(`Server running on port ${port}`);
  
  return { server, port };
};

/**
 * Fungsi untuk mengkonfigurasi graceful shutdown
 */
export const configureShutdown = (server: Server, logger: Logger): void => {
  const signals = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.log(`Received ${signal} signal, shutting down gracefully`);

      server.close(() => {
        logger.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    });
  }
};
