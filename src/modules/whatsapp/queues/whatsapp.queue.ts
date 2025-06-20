import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class WhatsappQueue {
  private readonly logger = new Logger(WhatsappQueue.name);

  constructor(@InjectQueue('whatsapp') private whatsappQueue: Queue) {
    this.logger.log('WhatsappQueue service initialized');
  }

  async addSendMessageJob(to: string, message: string, options?: any) {
    this.logger.debug(`Adding send message job to queue: ${to}`);

    try {
      return await this.whatsappQueue.add(
        'send-message',
        {
          to,
          message,
          options,
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
      this.logger.error(`Failed to add send message job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addInitSessionJob() {
    this.logger.debug('Adding initialize WhatsApp session job to queue');

    try {
      return await this.whatsappQueue.add(
        'init-session',
        {
          timestamp: new Date(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10_000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to add init session job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addStartAllSessionsJob() {
    this.logger.debug('Adding start all WhatsApp sessions job to queue');

    try {
      return await this.whatsappQueue.add(
        'start-all-sessions',
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
      this.logger.error(
        `Failed to add start all sessions job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addGetChatsJob() {
    this.logger.debug('Adding get chats job to queue');

    try {
      return await this.whatsappQueue.add(
        'get-chats',
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
      this.logger.error(`Failed to add get chats job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addBroadcastJob(recipients: string[], message: string, options?: any) {
    this.logger.debug(`Adding broadcast job to queue for ${recipients.length} recipients`);

    try {
      return await this.whatsappQueue.add(
        'broadcast-message',
        {
          recipients,
          message,
          options,
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
      this.logger.error(`Failed to add broadcast job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }
}
