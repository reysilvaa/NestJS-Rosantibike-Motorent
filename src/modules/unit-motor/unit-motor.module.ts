import { Module } from '@nestjs/common';
import { UnitMotorController } from './controllers/unit-motor.controller';
import { UnitMotorService } from './services/unit-motor.service';
import { PrismaModule, WebsocketModule } from '../../common';
import { BullModule } from '@nestjs/bullmq';
import { UnitMotorQueue } from './queues/unit-motor.queue';
import { UnitMotorProcessor } from './processors/unit-motor.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { JenisMotorModule } from '../jenis-motor/jenis-motor.module';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'unit-motor',
    }),
    JenisMotorModule,
  ],
  controllers: [UnitMotorController],
  providers: [UnitMotorService, UnitMotorQueue, UnitMotorProcessor],
  exports: [UnitMotorService, UnitMotorQueue],
})
export class UnitMotorModule {}
