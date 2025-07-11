import type { LoggerService } from '@nestjs/common';

export const logRequestDebugInfo = (req: any, logger: LoggerService) => {
  logger.log('DEBUG REQUEST:');
  logger.log('Headers:', JSON.stringify(req.headers, null, 2));
  logger.log('Raw Body:', req.rawBody);
  logger.log('Body:', JSON.stringify(req.body, null, 2));
  logger.log('Files:', JSON.stringify(req.files, null, 2));
};
