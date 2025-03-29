import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { QueueService } from '../../modules/queue/queue.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpQueueMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpQueueMiddleware.name);
  private readonly excludedPaths = ['/api/docs', '/api/health', '/debug/queue', '/favicon.ico'];

  constructor(private queueService: QueueService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Exclude certain paths from queueing
    if (this.isExcludedPath(req.path)) {
      return next();
    }

    // Generate unique ID for the request
    const requestId = uuidv4();

    // Capture body data
    const requestData = {
      id: requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      body: req.body,
      headers: req.headers,
      timestamp: new Date(),
    };

    try {
      // Add request to queue
      const job = await this.queueService.addHttpRequestJob(requestData);
      this.logger.log(`HTTP request queued: ${req.method} ${req.path} (${requestId})`);

      // Send response with tracking info
      res.status(202).json({
        status: 'accepted',
        message: 'Request diterima dan sedang diproses',
        requestId: requestId,
        jobId: job.id,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to queue request: ${error.message}`, error.stack);

      // If queue fails, process normally
      next();
    }
  }

  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some(
      excludedPath => path.startsWith(excludedPath) || path.includes('/socket.io/'),
    );
  }
}
