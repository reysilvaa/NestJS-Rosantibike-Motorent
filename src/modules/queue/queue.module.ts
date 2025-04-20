import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueDebugController } from './queue.controller';
import { QueueService } from './queue.service';
import { HttpRequestProcessor } from './processors/http-request.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          enableOfflineQueue: false,
          connectTimeout: 5000,
        },
        prefix: configService.get('QUEUE_PREFIX', 'rental'),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
        // Konfigurasi worker untuk BullMQ
        workers: {
          lockDuration: 30_000,
          stalledInterval: 30_000,
          maxStalledCount: 2,
        },
      }),
    }),
    // Daftarkan antrian secara umum
    BullModule.registerQueue(
      {
        name: 'transaksi',
      },
      {
        name: 'whatsapp',
      },
      {
        name: 'blog',
      },
      {
        name: 'unit-motor',
      },
      {
        name: 'jenis-motor',
      },
      {
        name: 'http-request',
      },
    ),
  ],
  controllers: [QueueDebugController],
  providers: [QueueService, HttpRequestProcessor],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
