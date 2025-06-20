import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class TransaksiQueue {
  private readonly logger = new Logger(TransaksiQueue.name);

  constructor(@InjectQueue('transaksi') private transaksiQueue: Queue) {
    this.logger.log('TransaksiQueue service initialized');
  }

  async addNotifikasiBookingJob(transaksiId: string) {
    this.logger.debug(`Adding notifikasi booking job to queue: ${transaksiId}`);

    try {
      return await this.transaksiQueue.add(
        'notifikasi-booking',
        {
          transaksiId,
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
        `Failed to add notifikasi booking job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addPengingatPengembalianJob(transaksiId: string) {
    this.logger.debug(`Adding pengingat pengembalian job to queue: ${transaksiId}`);

    try {
      return await this.transaksiQueue.add(
        'kirim-pengingat-pengembalian',
        {
          transaksiId,
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
        `Failed to add pengingat pengembalian job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addCekOverdueJob(transaksiId: string) {
    this.logger.debug(`Adding cek overdue job to queue: ${transaksiId}`);

    try {
      return await this.transaksiQueue.add(
        'cek-overdue',
        {
          transaksiId,
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
      this.logger.error(`Failed to add cek overdue job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addNotifikasiSelesaiJob(transaksiId: string) {
    this.logger.debug(`Adding notifikasi selesai job to queue: ${transaksiId}`);

    try {
      return await this.transaksiQueue.add(
        'kirim-notifikasi-selesai',
        {
          transaksiId,
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
        `Failed to add notifikasi selesai job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addScheduleCekOverdueJob(transaksiId: string, scheduleTime: Date) {
    this.logger.debug(
      `Adding scheduled cek overdue job to queue: ${transaksiId} at ${scheduleTime}`,
    );

    try {
      return await this.transaksiQueue.add(
        'cek-overdue',
        {
          transaksiId,
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
          delay: scheduleTime.getTime() - Date.now(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to add scheduled cek overdue job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
