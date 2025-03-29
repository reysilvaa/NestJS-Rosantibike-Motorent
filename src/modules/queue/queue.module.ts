import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
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
        redis: {
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
        settings: {
          lockDuration: 30_000,
          stalledInterval: 30_000,
          maxStalledCount: 2,
          guardInterval: 5000,
        },
        limiter: {
          max: 100,
          duration: 5000,
        },
      }),
    }),
    // Daftarkan antrian secara umum
    BullModule.registerQueue(
      {
        name: 'transaksi',
        limiter: { max: 30, duration: 5000 },
      },
      {
        name: 'whatsapp',
        limiter: { max: 20, duration: 10_000 },
      },
      {
        name: 'blog',
        limiter: { max: 10, duration: 5000 },
      },
      {
        name: 'unit-motor',
        limiter: { max: 20, duration: 5000 },
      },
      {
        name: 'jenis-motor',
        limiter: { max: 10, duration: 5000 },
      },
      {
        name: 'http-request',
        limiter: { max: 50, duration: 5000 },
      },
    ),
  ],
  controllers: [QueueDebugController],
  providers: [QueueService, HttpRequestProcessor],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
