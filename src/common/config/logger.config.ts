import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const createLogger = () => {
  const readableFormat = winston.format.printf(
    ({ level, message, timestamp, context, trace, ...meta }) => {
      const contextStr = context ? `[${context}] ` : '';
      const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
      const traceStr = trace ? `\n${trace}` : '';

      return `${timestamp} ${level.toUpperCase().padEnd(7)} ${contextStr}${message}${metaStr}${traceStr}`;
    },
  );

  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize({ all: true }),
          readableFormat,
        ),
      }),
    ],
  });
};
