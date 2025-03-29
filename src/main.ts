import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Bootstrap aplikasi dengan konfigurasi minimal
 */
async function bootstrap() {
  try {
    // Buat aplikasi dengan konfigurasi dasar
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      cors: true,
    });

    
    // Konfigurasi Swagger
    const config = new DocumentBuilder()
      .setTitle('Rental Motor API')
      .setDescription('API untuk sistem rental motor')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

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

bootstrap();
