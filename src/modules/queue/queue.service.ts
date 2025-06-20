import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private schedulers: Map<string, any> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private workers: Map<string, Worker> = new Map();
  private redisConfig: { host: string; port: number };

  private readonly maxDebugWorkers = 5;

  constructor(
    private configService: ConfigService,
    @InjectQueue('transaksi') private transaksiQueue: Queue,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    @InjectQueue('blog') private blogQueue: Queue,
    @InjectQueue('unit-motor') private unitMotorQueue: Queue,
    @InjectQueue('jenis-motor') private jenisMotorQueue: Queue,
    @InjectQueue('http-request') private httpRequestQueue: Queue,
  ) {
    this.redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379')),
    };
    this.logger.log('QueueService initialized');
  }

  getQueue(queueName: string): Queue | null {
    switch (queueName) {
      case 'transaksi': {
        return this.transaksiQueue;
      }
      case 'whatsapp': {
        return this.whatsappQueue;
      }
      case 'blog': {
        return this.blogQueue;
      }
      case 'unit-motor': {
        return this.unitMotorQueue;
      }
      case 'jenis-motor': {
        return this.jenisMotorQueue;
      }
      case 'http-request': {
        return this.httpRequestQueue;
      }
      default: {
        return null;
      }
    }
  }

  async addHttpRequestJob(requestData: any) {
    let priority = 5;

    switch (requestData.method) {
      case 'GET': {
        priority = 10;
        break;
      }
      case 'POST': {
        priority = 5;
        break;
      }
      case 'DELETE': {
        priority = 2;
        break;
      }
    }

    return this.httpRequestQueue.add('http-request', requestData, {
      priority,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  private queueInfoCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTtl = 5000;

  async getQueueInfo(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }

    const now = Date.now();
    const cacheKey = queueName;
    const cachedInfo = this.queueInfoCache.get(cacheKey);

    if (cachedInfo && now - cachedInfo.timestamp < this.cacheTtl) {
      return cachedInfo.data;
    }

    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

      const result = {
        name: queueName,
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
        paused,
        keys: await queue.getJobCounts(),
      };

      this.queueInfoCache.set(cacheKey, { data: result, timestamp: now });

      return result;
    } catch (error) {
      this.logger.error(`Error getting queue info for ${queueName}: ${error.message}`, error.stack);
      return null;
    }
  }

  getScheduler(queueName: string): any {
    if (!this.schedulers.has(queueName)) {
      const scheduler = { name: queueName, connection: this.redisConfig };

      this.schedulers.set(queueName, scheduler);
      this.logger.log(`Scheduler created for queue: ${queueName}`);
    }

    return this.schedulers.get(queueName)!;
  }

  getQueueEvents(queueName: string): QueueEvents {
    if (!this.queueEvents.has(queueName)) {
      const queueEvents = new QueueEvents(queueName, {
        connection: this.redisConfig,
      });

      this.queueEvents.set(queueName, queueEvents);
      this.logger.log(`QueueEvents created for queue: ${queueName}`);

      queueEvents.on('error', error => {
        this.logger.error(
          `QueueEvents error for queue ${queueName}: ${error.message}`,
          error.stack,
        );
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`Job ${jobId} failed in queue ${queueName}: ${failedReason}`);
      });

      queueEvents.on('stalled', ({ jobId }) => {
        this.logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
      });
    }

    return this.queueEvents.get(queueName)!;
  }

  async createDebugWorker(queueName: string, concurrency: number = 1): Promise<Worker> {
    if (this.workers.size >= this.maxDebugWorkers && !this.workers.has(queueName)) {
      this.logger.warn(
        `Reached max debug workers limit (${this.maxDebugWorkers}). Cannot create worker for ${queueName}`,
      );
      throw new Error(`Max debug workers limit reached (${this.maxDebugWorkers})`);
    }

    if (this.workers.has(queueName)) {
      await this.workers.get(queueName)!.close();
    }

    const worker = new Worker(
      queueName,
      async job => {
        this.logger.debug(`Processing job ${job.id} in debug worker (${queueName})`);
        this.logger.debug(`Job data: ${JSON.stringify(job.data)}`);

        await new Promise(resolve => setTimeout(resolve, Math.min(1000, 50 + Math.random() * 100)));

        return { processed: true, timestamp: new Date() };
      },
      {
        connection: this.redisConfig,
        concurrency,
        limiter: {
          max: 50,
          duration: 5000,
        },
      },
    );

    this.workers.set(queueName, worker);

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.id} failed in debug worker (${queueName}): ${error.message}`,
        error.stack,
      );
    });

    this.logger.log(`Debug worker created for queue: ${queueName} with concurrency ${concurrency}`);

    return worker;
  }

  async closeAll() {
    this.logger.log('Closing all queue resources...');

    const closePromises: Promise<void>[] = [];

    for (const [name, worker] of this.workers.entries()) {
      this.logger.log(`Closing worker for queue: ${name}`);
      closePromises.push(worker.close());
    }

    for (const [name, queueEvents] of this.queueEvents.entries()) {
      this.logger.log(`Closing queue events for queue: ${name}`);
      closePromises.push(queueEvents.close());
    }

    await Promise.all(closePromises);

    this.workers.clear();
    this.queueEvents.clear();
    this.schedulers.clear();
    this.queueInfoCache.clear();

    this.logger.log('All queue resources closed');
  }

  async onModuleDestroy() {
    await this.closeAll();
  }
}
