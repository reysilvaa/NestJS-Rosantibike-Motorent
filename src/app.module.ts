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
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Konfigurasi
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Common Module (termasuk Cloudinary)
    CommonModule,

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

    // File Upload
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: (req, file, cb) => {
            // Tentukan direktori berdasarkan tipe file atau modul
            const uploadPath = join(process.cwd(), 'public/uploads/jenis-motor');
            cb(null, uploadPath);
          },
          filename: (req, file, cb) => {
            // Buat nama file unik dengan timestamp
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          // Filter tipe file (hanya gambar)
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
      }),
      inject: [ConfigService],
    }),

    // Serve static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
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
