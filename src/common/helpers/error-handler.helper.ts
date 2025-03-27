import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';

/**
 * Menangani error dengan mencatat log dan melempar exception yang sesuai
 * @param logger Instance dari Logger
 * @param error Error yang terjadi
 * @param message Pesan error untuk internal server error
 * @param context Konteks error (opsional)
 */
export const handleError = (
  logger: Logger,
  error: any,
  message: string,
  context?: string
) => {
  logger.error(`Error: ${error.message}`, context);
  logger.error(`Error stack: ${error.stack}`, context);
  
  if (error instanceof NotFoundException || error instanceof BadRequestException) {
    throw error;
  }
  
  throw new InternalServerErrorException(`${message}: ${error.message}`);
};

/**
 * Mencatat log error dan melempar exception yang sesuai
 * @param logger Instance dari Logger
 * @param message Pesan untuk log
 * @param context Konteks log
 */
export const logInfo = (
  logger: Logger,
  message: string,
  context?: string
) => {
  logger.log(message, context);
}; 