import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueDebugController } from './queue.controller';
import { QueueService } from './queue.service';
import { HttpRequestProcessor } from './processors/http-request.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
          retryStrategy: times => {
            const delay = Math.min(times * 100, 3000);
            console.log(`BullMQ Redis reconnecting attempt ${times} after ${delay}ms`);
            return delay;
          },
          reconnectOnError: err => {
            console.error(`BullMQ Redis connection error: ${err.message}`);
            return true;
          },
          connectTimeout: 10_000,
          autoResubscribe: true,
          autoResendUnfulfilledCommands: true,
          enableReadyCheck: true,
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
        workers: {
          lockDuration: 30_000,
          stalledInterval: 30_000,
          maxStalledCount: 2,
          drainDelay: 5,
        },
      }),
    }),
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