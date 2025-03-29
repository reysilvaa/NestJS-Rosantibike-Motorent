import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { JenisMotorModule } from './modules/jenis-motor/jenis-motor.module';
import { UnitMotorModule } from './modules/unit-motor/unit-motor.module';
import { TransaksiModule } from './modules/transaksi/transaksi.module';
import { BlogModule } from './modules/blog/blog.module';
import { LoggerModule } from './common/logger/logger.module';
import { GatewayModule } from './common/gateway/gateway.module';
import { CommonModule } from './common/common.module';
import { SocketModule } from './common/gateway/socket.module';

@Module({
  imports: [
    // Konfigurasi global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Common Module (termasuk Cloudinary)
    CommonModule,

    // Database
    PrismaModule,

    // Logger
    LoggerModule,

    // WebSocket Gateway
    GatewayModule,

    // Core Feature Modules
    AuthModule,
    AdminModule,
    JenisMotorModule,
    UnitMotorModule,
    TransaksiModule,
    BlogModule,
    SocketModule,
  ],
})
export class AppModule {}
