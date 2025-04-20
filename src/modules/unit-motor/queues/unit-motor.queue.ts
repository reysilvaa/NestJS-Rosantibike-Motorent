import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class UnitMotorQueue {
  private readonly logger = new Logger(UnitMotorQueue.name);

  constructor(@InjectQueue('unit-motor') private unitMotorQueue: Queue) {
    this.logger.log('UnitMotorQueue service initialized');
  }

  /**
   * Menambahkan tugas untuk sinkronisasi data unit motor
   */
  async addSyncDataJob() {
    this.logger.debug('Adding sync data job to queue');

    try {
      return await this.unitMotorQueue.add(
        'sync-data',
        {
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
      this.logger.error(`Failed to add sync data job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Menambahkan tugas untuk pemeliharaan rutin unit motor
   */
  async addMaintenanceReminderJob(unitMotorId: string) {
    this.logger.debug(`Adding maintenance reminder job to queue for unit motor: ${unitMotorId}`);

    try {
      return await this.unitMotorQueue.add(
        'maintenance-reminder',
        {
          unitMotorId,
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
        `Failed to add maintenance reminder job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Menambahkan tugas untuk memperbarui status unit motor
   */
  async addUpdateStatusJob(unitMotorId: string, status: string) {
    this.logger.debug(`Adding update status job to queue for unit motor: ${unitMotorId}`);

    try {
      return await this.unitMotorQueue.add(
        'update-status',
        {
          unitMotorId,
          status,
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
      this.logger.error(`Failed to add update status job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Menambahkan tugas untuk memproses gambar unit motor
   */
  async addProcessImageJob(unitMotorId: string, images: string[]) {
    this.logger.debug(`Adding process image job to queue for unit motor: ${unitMotorId}`);

    try {
      return await this.unitMotorQueue.add(
        'process-images',
        {
          unitMotorId,
          images,
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
}
