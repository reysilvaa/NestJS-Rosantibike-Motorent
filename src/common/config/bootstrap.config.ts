import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { CustomIoAdapter } from '../helpers/socket-adapter.helper';
import { setupSwagger } from './swagger.config';
import { setupCors } from './cors.config';

export async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      bodyParser: true,
    });

    setupCors(app);

    app.useWebSocketAdapter(new CustomIoAdapter(app));

    setupSwagger(app);

    const configService = app.get(ConfigService);
    const port = configService.get('PORT', 3030);

    await app.listen(port);
    Logger.log(`Aplikasi berjalan di http://localhost:${port}`);
    Logger.log(`Dokumentasi API tersedia di http://localhost:${port}/api/docs`);
  } catch (error) {
    Logger.error(`Error saat menjalankan aplikasi: ${error.message}`);
    Logger.error(error.stack);
  }
}
