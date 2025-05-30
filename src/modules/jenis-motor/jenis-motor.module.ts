import { Module } from '@nestjs/common';
import { JenisMotorController } from './controllers/jenis-motor.controller';
import { JenisMotorService } from './services/jenis-motor.service';
import { PrismaModule, WebsocketModule } from '../../common';
import { BullModule } from '@nestjs/bullmq';
import { JenisMotorQueue } from './queues/jenis-motor.queue';
import { JenisMotorProcessor } from './processors/jenis-motor.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'jenis-motor',
    }),
  ],
  controllers: [JenisMotorController],
  providers: [JenisMotorService, JenisMotorQueue, JenisMotorProcessor],
  exports: [JenisMotorService, JenisMotorQueue],
})
export class JenisMotorModule {}
