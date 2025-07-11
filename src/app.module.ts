import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CloudinaryModule,
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [CLOUDINARY_CONFIG],
    }),

    CloudinaryModule,

    PrismaModule,

    WebsocketModule,

    RedisModule,

    QueueModule,

    AuthModule,
    AdminModule,
    JenisMotorModule,
    UnitMotorModule,
    TransaksiModule,
    BlogModule,
  ],
})
export class AppModule {}
