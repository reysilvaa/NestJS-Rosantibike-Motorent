import type { Logger } from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export const handleError = (logger: Logger, error: any, message: string, context?: string) => {
  logger.error(`Error: ${error.message}`, context);
  logger.error(`Error stack: ${error.stack}`, context);

  if (error instanceof NotFoundException || error instanceof BadRequestException) {
    throw error;
  }

  throw new InternalServerErrorException(`${message}: ${error.message}`);
};

export const logInfo = (logger: Logger, message: string, context?: string) => {
  logger.log(message, context);
};
