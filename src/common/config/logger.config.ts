import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { LoggerService } from '@nestjs/common';
import { join } from 'path';

export interface LoggerConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
}

const defaultLoggerConfig: LoggerConfig = {
  level: process.env.LOG_LEVEL || 'debug',
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  logDir: process.env.LOG_DIR || 'logs',
};

export const createWinstonLogger = (
  context?: string,
  config?: Partial<LoggerConfig>,
): LoggerService => {
  const loggerConfig: LoggerConfig = {
    ...defaultLoggerConfig,
    ...config,
  };

  const transports: winston.transport[] = [];

  const logFormat = winston.format.printf(
    ({ level, message, timestamp, context: msgContext, trace, ...meta }) => {
      const contextStr = msgContext || context ? `[${msgContext || context}] ` : '';
      const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
      const traceStr = trace ? `\n${trace}` : '';
      return `${timestamp} ${level.toUpperCase().padEnd(7)} ${contextStr}${message}${metaStr}${traceStr}`;
    },
  );

  if (loggerConfig.enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize({ all: true }),
          logFormat,
        ),
      }),
    );
  }

  if (loggerConfig.enableFile) {
    const logDir = loggerConfig.logDir;

    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
      new winston.transports.File({
        filename: join(logDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
    );
  }

  return WinstonModule.createLogger({
    level: loggerConfig.level,
    transports,
  });
};

export const appLogger = createWinstonLogger('App');

export const createBootstrapLogger = (): LoggerService => {
  return createWinstonLogger('Bootstrap');
};

export default appLogger;
