import { Controller, Get, Post, Param, Delete, Query, Logger, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueService } from './queue.service';
import type { Job } from 'bullmq';

@ApiTags('Queue Debug')
@Controller('debug/queue')
export class QueueDebugController {
  private readonly logger = new Logger(QueueDebugController.name);

  constructor(
    @InjectQueue('transaksi') private transaksiQueue: Queue,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    @InjectQueue('blog') private blogQueue: Queue,
    @InjectQueue('unit-motor') private unitMotorQueue: Queue,
    @InjectQueue('jenis-motor') private jenisMotorQueue: Queue,
    private readonly queueService: QueueService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Dapatkan status semua queues' })
  async getStatus() {
    this.logger.log('Memanggil getStatus()');

    const queueNames = ['transaksi', 'whatsapp', 'blog', 'unit-motor', 'jenis-motor'];
    const statuses = await Promise.all(
      queueNames.map(queueName => this.queueService.getQueueInfo(queueName)),
    );

    return {
      timestamp: new Date(),
      queues: statuses.filter(status => !!status),
    };
  }

  @Get(':queue/status')
  @ApiOperation({ summary: 'Dapatkan status queue tertentu' })
  @ApiParam({
    name: 'queue',
    description: 'Nama queue (transaksi, whatsapp, blog, unit-motor, jenis-motor)',
    example: 'unit-motor',
  })
  async getQueueStatus(@Param('queue') queueName: string) {
    this.logger.log(`Memanggil getQueueStatus(${queueName})`);

    const status = await this.queueService.getQueueInfo(queueName);
    if (!status) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    return {
      timestamp: new Date(),
      queue: status,
    };
  }

  @Get(':queue/jobs')
  @ApiOperation({ summary: 'Dapatkan daftar jobs di queue' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiQuery({
    name: 'status',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
    required: false,
  })
  @ApiQuery({ name: 'size', description: 'Jumlah job yang diambil', required: false, type: Number })
  @ApiQuery({ name: 'start', description: 'Posisi start', required: false, type: Number })
  async getJobs(
    @Param('queue') queueName: string,
    @Query('status') status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
    @Query('start') start: number = 0,
    @Query('size') size: number = 10,
  ) {
    this.logger.log(`Memanggil getJobs(${queueName}, ${status}, ${start}, ${size})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    let jobs: Job[] = [];

    try {
      switch (status) {
        case 'waiting': {
          jobs = await queue.getWaiting(start, start + size - 1);
          break;
        }
        case 'active': {
          jobs = await queue.getActive(start, start + size - 1);
          break;
        }
        case 'completed': {
          jobs = await queue.getCompleted(start, start + size - 1);
          break;
        }
        case 'failed': {
          jobs = await queue.getFailed(start, start + size - 1);
          break;
        }
        case 'delayed': {
          jobs = await queue.getDelayed(start, start + size - 1);
          break;
        }
      }

      const simplifiedJobs = jobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        opts: {
          priority: job.opts.priority,
          delay: job.opts.delay,
          attempts: job.opts.attempts,
          backoff: job.opts.backoff,
        },
        status,
        progress: job.progress,
        returnvalue: job.returnvalue,
        stacktrace: job.stacktrace,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      }));

      return {
        timestamp: new Date(),
        jobs: simplifiedJobs,
        count: simplifiedJobs.length,
      };
    } catch (error) {
      this.logger.error(`Error getting ${status} jobs: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal mendapatkan jobs: ${error.message}`,
      };
    }
  }

  @Get(':queue/jobs/:id')
  @ApiOperation({ summary: 'Dapatkan detail job berdasarkan ID' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiParam({ name: 'id', description: 'ID job', example: '1' })
  async getJobById(@Param('queue') queueName: string, @Param('id') jobId: string) {
    this.logger.log(`Memanggil getJobById(${queueName}, ${jobId})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      const job = await queue.getJob(jobId);

      if (!job) {
        return { status: 'error', message: `Job dengan ID '${jobId}' tidak ditemukan` };
      }

      const state = await job.getState();

      return {
        timestamp: new Date(),
        job: {
          id: job.id,
          name: job.name,
          data: job.data,
          opts: {
            priority: job.opts.priority,
            delay: job.opts.delay,
            attempts: job.opts.attempts,
            backoff: job.opts.backoff,
          },
          status: state,
          progress: job.progress,
          returnvalue: job.returnvalue,
          stacktrace: job.stacktrace,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          logs: await job.getLogs(),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting job details: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal mendapatkan detail job: ${error.message}`,
      };
    }
  }

  @Post(':queue/jobs/:id/retry')
  @ApiOperation({ summary: 'Retry job yang gagal' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiParam({ name: 'id', description: 'ID job', example: '1' })
  async retryJob(@Param('queue') queueName: string, @Param('id') jobId: string) {
    this.logger.log(`Memanggil retryJob(${queueName}, ${jobId})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      const job = await queue.getJob(jobId);

      if (!job) {
        return { status: 'error', message: `Job dengan ID '${jobId}' tidak ditemukan` };
      }

      const state = await job.getState();

      if (state !== 'failed') {
        return {
          status: 'error',
          message: `Hanya job dengan status 'failed' yang dapat di-retry. Status saat ini: ${state}`,
        };
      }

      await job.retry();

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Job '${jobId}' telah dijalankan ulang`,
        jobId,
      };
    } catch (error) {
      this.logger.error(`Error retrying job: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal menjalankan ulang job: ${error.message}`,
      };
    }
  }

  @Delete(':queue/jobs/:id')
  @ApiOperation({ summary: 'Hapus job dari queue' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiParam({ name: 'id', description: 'ID job', example: '1' })
  async removeJob(@Param('queue') queueName: string, @Param('id') jobId: string) {
    this.logger.log(`Memanggil removeJob(${queueName}, ${jobId})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      const job = await queue.getJob(jobId);

      if (!job) {
        return { status: 'error', message: `Job dengan ID '${jobId}' tidak ditemukan` };
      }

      await job.remove();

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Job '${jobId}' telah dihapus`,
        jobId,
      };
    } catch (error) {
      this.logger.error(`Error removing job: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal menghapus job: ${error.message}`,
      };
    }
  }

  @Post(':queue/jobs')
  @ApiOperation({ summary: 'Tambahkan job ke queue (untuk testing)' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'test-job' },
        data: { type: 'object', example: { test: true, message: 'Test data' } },
        options: {
          type: 'object',
          example: {
            delay: 0,
            priority: 1,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          },
        },
      },
    },
  })
  async addJob(
    @Param('queue') queueName: string,
    @Body() jobData: { name?: string; data: any; options?: any },
  ) {
    this.logger.log(`Memanggil addJob(${queueName})`);
    this.logger.debug(`Job data: ${JSON.stringify(jobData)}`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      const { name = 'test-job', data, options = {} } = jobData;

      const job = await queue.add(name, data, options);

      this.queueService.createDebugWorker(queueName);

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Job berhasil ditambahkan ke queue '${queueName}'`,
        job: {
          id: job.id,
          name: job.name,
        },
      };
    } catch (error) {
      this.logger.error(`Error adding job: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal menambahkan job: ${error.message}`,
      };
    }
  }

  @Delete(':queue/clean')
  @ApiOperation({ summary: 'Bersihkan queue dari job yang telah selesai' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiQuery({ name: 'status', enum: ['completed', 'failed', 'delayed'], required: false })
  @ApiQuery({
    name: 'limit',
    description: 'Jumlah job yang akan dibersihkan',
    required: false,
    type: Number,
  })
  async cleanQueue(
    @Param('queue') queueName: string,
    @Query('status') status: 'completed' | 'failed' | 'delayed' = 'completed',
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Memanggil cleanQueue(${queueName}, ${status}, ${limit})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      const count = await queue.clean(0, limit || 1000, status);

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Queue '${queueName}' telah dibersihkan`,
        cleanedJobs: {
          [status]: count,
        },
      };
    } catch (error) {
      this.logger.error(`Error cleaning queue: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal membersihkan queue: ${error.message}`,
      };
    }
  }

  @Delete(':queue/empty')
  @ApiOperation({ summary: 'Kosongkan queue' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  async emptyQueue(@Param('queue') queueName: string) {
    this.logger.log(`Memanggil emptyQueue(${queueName})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      await queue.obliterate();

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Queue '${queueName}' telah dikosongkan`,
      };
    } catch (error) {
      this.logger.error(`Error emptying queue: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal mengosongkan queue: ${error.message}`,
      };
    }
  }

  @Post(':queue/pause')
  @ApiOperation({ summary: 'Jeda queue' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  async pauseQueue(@Param('queue') queueName: string) {
    this.logger.log(`Memanggil pauseQueue(${queueName})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      await queue.pause();

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Queue '${queueName}' telah dijeda`,
      };
    } catch (error) {
      this.logger.error(`Error pausing queue: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal menjeda queue: ${error.message}`,
      };
    }
  }

  @Post(':queue/resume')
  @ApiOperation({ summary: 'Lanjutkan queue yang telah dijeda' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  async resumeQueue(@Param('queue') queueName: string) {
    this.logger.log(`Memanggil resumeQueue(${queueName})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      await queue.resume();

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Queue '${queueName}' telah dilanjutkan`,
      };
    } catch (error) {
      this.logger.error(`Error resuming queue: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal melanjutkan queue: ${error.message}`,
      };
    }
  }

  @Get('workers')
  @ApiOperation({ summary: 'Dapatkan daftar debug workers yang sedang berjalan' })
  getDebugWorkers() {
    return {
      timestamp: new Date(),
      workers: [...this.queueService['workers'].keys()],
    };
  }

  @Post(':queue/start-debug-worker')
  @ApiOperation({ summary: 'Mulai debug worker untuk queue tertentu' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  @ApiQuery({
    name: 'concurrency',
    description: 'Jumlah job yang diproses secara bersamaan',
    required: false,
    type: Number,
  })
  async startDebugWorker(
    @Param('queue') queueName: string,
    @Query('concurrency') concurrency: number = 1,
  ) {
    this.logger.log(`Memanggil startDebugWorker(${queueName}, ${concurrency})`);

    const queue = this.queueService.getQueue(queueName);
    if (!queue) {
      return { status: 'error', message: `Queue '${queueName}' tidak ditemukan` };
    }

    try {
      await this.queueService.createDebugWorker(queueName, concurrency);

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Debug worker untuk queue '${queueName}' telah dimulai dengan concurrency ${concurrency}`,
      };
    } catch (error) {
      this.logger.error(`Error starting debug worker: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal memulai debug worker: ${error.message}`,
      };
    }
  }

  @Delete(':queue/stop-debug-worker')
  @ApiOperation({ summary: 'Hentikan debug worker untuk queue tertentu' })
  @ApiParam({ name: 'queue', description: 'Nama queue', example: 'unit-motor' })
  async stopDebugWorker(@Param('queue') queueName: string) {
    this.logger.log(`Memanggil stopDebugWorker(${queueName})`);

    if (!this.queueService['workers'].has(queueName)) {
      return {
        status: 'warning',
        message: `Tidak ada debug worker yang berjalan untuk queue '${queueName}'`,
      };
    }

    try {
      const worker = this.queueService['workers'].get(queueName);

      if (worker) {
        await worker.close();
        this.queueService['workers'].delete(queueName);
      }

      return {
        timestamp: new Date(),
        status: 'success',
        message: `Debug worker untuk queue '${queueName}' telah dihentikan`,
      };
    } catch (error) {
      this.logger.error(`Error stopping debug worker: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Gagal menghentikan debug worker: ${error.message}`,
      };
    }
  }
} 