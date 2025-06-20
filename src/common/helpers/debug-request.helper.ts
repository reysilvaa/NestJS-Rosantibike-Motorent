import type { Logger } from '@nestjs/common';

export const logRequestDebugInfo = (req: any, logger: Logger) => {
  logger.log('DEBUG REQUEST:');
  logger.log('Headers:', JSON.stringify(req.headers, null, 2));
  logger.log('Raw Body:', req.rawBody);
  logger.log('Body:', JSON.stringify(req.body, null, 2));
  logger.log('Files:', JSON.stringify(req.files, null, 2));
  logger.log('Raw Files:', JSON.stringify(req.rawFiles, null, 2));
  logger.log('Raw Request:', req.raw);
  logger.log('Request Method:', req.method);
  logger.log('Request URL:', req.url);
  logger.log('Request Protocol:', req.protocol);
  logger.log('Request Host:', req.hostname);
  logger.log('Request Path:', req.path);
  logger.log('Request IP:', req.ip);
  logger.log('Request Original URL:', req.originalUrl);
  logger.log('Request Base URL:', req.baseUrl);

  if (req.body) {
    logger.log('Body Fields:');
    Object.keys(req.body).forEach(key => {
      logger.log(`- ${key}: ${typeof req.body[key]}`);
    });
  }

  if (req.files && Object.keys(req.files).length > 0) {
    logger.log('File Fields:');
    Object.keys(req.files).forEach(key => {
      logger.log(`- ${key}: ${req.files[key].length} files`);
      req.files[key].forEach((file: any, index: number) => {
        logger.log(`  ${index + 1}. ${file.originalname} (${file.mimetype})`);
      });
    });
  }

  if (req.rawBody) {
    logger.log('Raw Request Body Length:', req.rawBody.length);
    logger.log('Raw Request Body Preview:', req.rawBody.toString().slice(0, 1000));
  }

  return {
    message: 'Debug info',
    headers: req.headers,
    body: req.body,
    files: req.files ? Object.keys(req.files) : [],
    hasFile: !!req.files,
    bodyFields: req.body ? Object.keys(req.body) : [],
    contentType: req.headers['content-type'],
    method: req.method,
    url: req.url,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    hasRawBody: !!req.rawBody,
    rawBodyLength: req.rawBody ? req.rawBody.length : 0,
  };
};
