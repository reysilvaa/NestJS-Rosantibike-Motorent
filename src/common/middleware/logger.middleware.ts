import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    // Catat waktu mulai request
    const startTime = Date.now();

    // Tangkap event 'finish' untuk mencatat setelah request selesai
    res.on('finish', () => {
      const contentLength = res.get('content-length') || 0;
      const statusCode = res.statusCode;
      const responseTime = Date.now() - startTime;

      // Format log message
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${userAgent} ${ip}`,
      );
    });

    next();
  }
}
