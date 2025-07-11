import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CloudinaryModule,
  PrismaModule,
  WebsocketModule,
  RedisModule,
  QueueModule,
} from './common';
import { CacheModule } from './common/modules/cache/cache.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    CloudinaryModule,

    PrismaModule,

    WebsocketModule,

    RedisModule,

    QueueModule,
    
    // Modul cache untuk otomatisasi caching
    CacheModule,

    AuthModule,
    AdminModule,
    JenisMotorModule,
    UnitMotorModule,
    TransaksiModule,
    BlogModule,
  ],
})
export class AppModule {}
