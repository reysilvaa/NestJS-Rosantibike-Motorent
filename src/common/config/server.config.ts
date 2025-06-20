import type { INestApplication, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';

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

export const configureShutdown = (server: Server, logger: Logger): void => {
  const signals = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.log(`Received ${signal} signal, shutting down gracefully`);

      server.close(() => {
        logger.log('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    });
  }
};
