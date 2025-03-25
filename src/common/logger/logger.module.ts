import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        return {
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.ms(),
                winston.format.colorize(),
                winston.format.printf(info => {
                  return `[${info.timestamp}] ${info.level}: ${info.message}`;
                }),
              ),
            }),
          ],
        };
      },
    }),
  ],
})
export class LoggerModule {}
