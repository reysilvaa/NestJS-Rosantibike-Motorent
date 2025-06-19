import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { CustomIoAdapter } from '../helpers/socket-adapter.helper';
import { setupSwagger } from './swagger.config';
import { setupCors } from './cors.config';

/**
 * Bootstrap aplikasi dengan konfigurasi lengkap
 */
export async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      bodyParser: true,
    });

    // Konfigurasi CORS dan body parser
    setupCors(app);

    // Konfigurasi adapter WebSocket
    app.useWebSocketAdapter(new CustomIoAdapter(app));

    // Konfigurasi Swagger
    setupSwagger(app);

    // Ambil port dari config service
    const configService = app.get(ConfigService);
    const port = configService.get('PORT', 3030);

    // Jalankan aplikasi
    await app.listen(port);
    Logger.log(`Aplikasi berjalan di http://localhost:${port}`);
    Logger.log(`Dokumentasi API tersedia di http://localhost:${port}/api/docs`);
  } catch (error) {
    Logger.error(`Error saat menjalankan aplikasi: ${error.message}`);
    Logger.error(error.stack);
  }
}
