import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';

import { ModuleRef } from '@nestjs/core';
import * as express from 'express';
import { HttpAdapterHost } from '@nestjs/core';

@Processor('http-request')
export class HttpRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(HttpRequestProcessor.name);

  constructor(
    private moduleRef: ModuleRef,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {
    super();
    this.logger.log('HttpRequestProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'http-request': {
        return this.handleHttpRequest(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async handleHttpRequest(job: Job) {
    const { id, method, path, query, params, body, headers, timestamp } = job.data;
    this.logger.log(`Processing HTTP request: ${method} ${path} (${id})`);

    try {
      // Buat waktu eksekusi untuk simulasi processing time
      const startTime = Date.now();
      const processingTime = Math.random() * 200 + 50; // 50-250ms

      // Simulasi pemrosesan request
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Kumpulkan data response
      const endTime = Date.now();
      const responseData = {
        success: true,
        requestId: id,
        method,
        path,
        processingTimeMs: endTime - startTime,
        timestamp: new Date(),
        result: {
          // Contoh data response, akan berbeda berdasarkan endpoint sebenarnya
          message: `Request ${method} ${path} berhasil diproses`,
          data: this.generateMockResponse(method, path, query, body),
        },
      };

      // Progress reporting
      await job.updateProgress(100);

      this.logger.log(
        `HTTP request processed: ${method} ${path} (${id}) in ${endTime - startTime}ms`,
      );
      return responseData;
    } catch (error) {
      this.logger.error(`Error processing HTTP request: ${error.message}`, error.stack);

      // Kembalikan error agar dapat ditangkap oleh client
      throw new Error(`Gagal memproses request: ${error.message}`);
    }
  }

  /**
   * Generate mock response berdasarkan path dan method
   * Di implementasi nyata, ini akan memanggil controller/service yang sesuai
   */
  private generateMockResponse(method: string, path: string, query: any, body: any): any {
    // Ekstrak endpoint base (misalnya /api/users/123 -> users)
    const segments = path.split('/').filter(Boolean);
    const resourceType = segments.length > 1 ? segments[1] : 'unknown';
    const resourceId = segments.length > 2 ? segments[2] : null;

    // Buat response berdasarkan resource type dan method
    switch (resourceType) {
      case 'users': {
        if (method === 'GET') {
          if (resourceId) {
            return {
              id: resourceId,
              name: `User ${resourceId}`,
              email: `user${resourceId}@example.com`,
            };
          } else {
            return {
              items: [
                { id: 1, name: 'User 1' },
                { id: 2, name: 'User 2' },
              ],
              total: 2,
            };
          }
        } else if (method === 'POST') {
          return { id: 999, ...body, created: true };
        }
        break;
      }
      case 'products': {
        if (method === 'GET') {
          if (resourceId) {
            return {
              id: resourceId,
              name: `Product ${resourceId}`,
              price: 1000 * parseInt(resourceId),
            };
          } else {
            return {
              items: [
                { id: 1, name: 'Product 1' },
                { id: 2, name: 'Product 2' },
              ],
              total: 2,
            };
          }
        }
        break;
      }
      default: {
        return { message: `Response for ${method} ${path}` };
      }
    }

    return { message: `Processed ${method} ${path}` };
  }
}
