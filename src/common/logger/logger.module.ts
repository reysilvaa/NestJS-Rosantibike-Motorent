import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logFormat = configService.get('LOG_FORMAT') || 'text';
        const logLevel = configService.get('LOG_LEVEL') || 'debug';

        // Format untuk teks yang mudah dibaca
        const readableFormat = winston.format.printf(
          ({ level, message, timestamp, context, trace, ...meta }) => {
            const contextStr = context ? `[${context}] ` : '';
            const metaStr =
              Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
            const traceStr = trace ? `\n${trace}` : '';

            return `${timestamp} ${level.toUpperCase().padEnd(7)} ${contextStr}${message}${metaStr}${traceStr}`;
          },
        );

        let formatter;
        if (logFormat === 'json') {
          formatter = winston.format.combine(winston.format.timestamp(), winston.format.json());
        } else {
          formatter = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize({ all: true }),
            readableFormat,
          );
        }

        return {
          level: logLevel,
          transports: [
            new winston.transports.Console({
              format: formatter,
            }),
          ],
        };
      },
    }),
  ],
})
export class LoggerModule {}
