import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { JenisMotorModule } from './modules/jenis-motor/jenis-motor.module';
import { UnitMotorModule } from './modules/unit-motor/unit-motor.module';
import { TransaksiModule } from './modules/transaksi/transaksi.module';
import { BlogModule } from './modules/blog/blog.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { LoggerModule } from './common/logger/logger.module';
import { GatewayModule } from './common/gateway/gateway.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    // Konfigurasi
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Redis
    RedisModule,

    // Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
        prefix: configService.get('QUEUE_PREFIX'),
      }),
      inject: [ConfigService],
    }),

    // Database
    PrismaModule,

    // Logger
    LoggerModule,

    // WebSocket Gateway
    GatewayModule,

    // Feature Modules
    AuthModule,
    AdminModule,
    JenisMotorModule,
    UnitMotorModule,
    TransaksiModule,
    BlogModule,
    WhatsappModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
