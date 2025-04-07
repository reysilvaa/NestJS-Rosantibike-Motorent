import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class JenisMotorQueue {
  private readonly logger = new Logger(JenisMotorQueue.name);

  constructor(@InjectQueue('jenis-motor') private jenisMotorQueue: Queue) {
    this.logger.log('JenisMotorQueue service initialized');
  }

  /**
   * Menambahkan tugas untuk memproses gambar jenis motor
   */
  async addProcessImageJob(jenisMotorId: string, imageData: any) {
    this.logger.debug(`Adding process image job to queue for jenis motor ID: ${jenisMotorId}`);

    try {
      return await this.jenisMotorQueue.add(
        'process-image',
        {
          jenisMotorId,
          imageData,
          timestamp: new Date(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to add process image job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Menambahkan tugas untuk memperbarui cache data jenis motor
   */
  async addUpdateCacheJob() {
    this.logger.debug('Adding update cache job to queue');

    try {
      return await this.jenisMotorQueue.add(
        'update-cache',
        {
          timestamp: new Date(),
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to add update cache job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Menambahkan tugas untuk mengirim notifikasi jenis motor baru
   */
  async addNotifyNewJenisMotorJob(jenisMotorId: string) {
    this.logger.debug(`Adding notify new jenis motor job to queue: ${jenisMotorId}`);

    try {
      return await this.jenisMotorQueue.add(
        'notify-new',
        {
          jenisMotorId,
          timestamp: new Date(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to add notify new jenis motor job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
