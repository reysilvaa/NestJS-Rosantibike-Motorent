import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class BlogQueue {
  private readonly logger = new Logger(BlogQueue.name);

  constructor(@InjectQueue('blog') private blogQueue: Queue) {
    this.logger.log('BlogQueue service initialized');
  }

  async addCreateBlogJob(blogData: any) {
    this.logger.debug(`Adding create blog job to queue: ${blogData.title}`);

    try {
      return await this.blogQueue.add(
        'create-blog',
        {
          blogData,
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
      this.logger.error(`Failed to add create blog job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addProcessImageJob(blogId: string, imageData: any) {
    this.logger.debug(`Adding process image job to queue for blog ID: ${blogId}`);

    try {
      return await this.blogQueue.add(
        'process-image',
        {
          blogId,
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

  async addBroadcastBlogJob(blogId: string) {
    this.logger.debug(`Adding broadcast blog job to queue for blog ID: ${blogId}`);

    try {
      return await this.blogQueue.add(
        'broadcast-blog',
        {
          blogId,
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
      this.logger.error(`Failed to add broadcast blog job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }
}
