import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule, LoggerModule, PrismaModule, WebsocketModule } from './common';
import {
  AuthModule,
  AdminModule,
  JenisMotorModule,
  UnitMotorModule,
  TransaksiModule,
  BlogModule,
} from './modules';

@Module({
  imports: [
    // Konfigurasi global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Common Module (termasuk Cloudinary)
    CloudinaryModule,

    // Database
    PrismaModule,

    // Logger
    LoggerModule,

    // Realtime Websocket
    WebsocketModule,

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
