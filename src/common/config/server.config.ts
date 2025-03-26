import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'http';

/**
 * Konfigurasi untuk menjalankan server dengan penanganan port yang lebih baik
 */
export const startServer = async (
  app: INestApplication,
  configService: ConfigService,
  logger: Logger,
): Promise<{ server: Server; port: number }> => {
  let port = configService.get('PORT') || 3000;
  let server: Server | null = null;

  // Mencoba port alternatif jika port utama sudah digunakan
  const tryListen = async (retries = 3): Promise<boolean> => {
    try {
      server = await app.listen(port);
      logger.log(`Aplikasi berhasil dijalankan pada port: ${port}`);
      return true;
    } catch (error) {
      if (error.code === 'EADDRINUSE' && retries > 0) {
        logger.log(`Port ${port} sudah digunakan, mencoba port ${port + 1}...`);
        port += 1;
        return tryListen(retries - 1);
      }
      throw error;
    }
  };

  await tryListen();

  // Mengembalikan server dan port yang berhasil digunakan
  if (!server) {
    throw new Error('Server failed to initialize');
  }

  return { server, port };
};

/**
 * Konfigurasi penanganan shutdown aplikasi
 */
export const configureShutdown = (server: Server, logger: Logger): void => {
  // Penanganan shutdown yang lebih baik
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM diterima. Menutup server HTTP...');
    await server.close();
    logger.log('Server HTTP ditutup.');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT diterima. Menutup server HTTP...');
    await server.close();
    logger.log('Server HTTP ditutup.');
    process.exit(0);
  });
};
