import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CloudinaryModule,
  LoggerModule,
  PrismaModule,
  WebsocketModule,
  CLOUDINARY_CONFIG,
} from './common';
import {
  AuthModule,
  AdminModule,
  JenisMotorModule,
  UnitMotorModule,
  TransaksiModule,
  BlogModule,
  QueueModule,
  RedisModule,
} from './modules';

@Module({
  imports: [
    // Konfigurasi global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [CLOUDINARY_CONFIG],
    }),

    // Common Module (termasuk Cloudinary)
    CloudinaryModule,

    // Database
    PrismaModule,

    // Logger
    LoggerModule,

    // Realtime Websocket
    WebsocketModule,

    // Redis Cache & Connections
    RedisModule,

    // Queue Management
    QueueModule,

    // Core Feature Modules
    AuthModule,
    AdminModule,
    JenisMotorModule,
    UnitMotorModule,
    TransaksiModule,
    BlogModule,
  ],
})
export class AppModule {}
