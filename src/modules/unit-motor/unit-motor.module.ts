import { Module } from '@nestjs/common';
import { UnitMotorController } from './controllers/unit-motor.controller';
import { UnitMotorService } from './services/unit-motor.service';
import { PrismaModule, GatewayModule } from '../../common';
import { BullModule } from '@nestjs/bull';
import { UnitMotorQueue } from './queues/unit-motor.queue';
import { UnitMotorProcessor } from './processors/unit-motor.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    GatewayModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'unit-motor',
    }),
  ],
  controllers: [UnitMotorController],
  providers: [UnitMotorService, UnitMotorQueue, UnitMotorProcessor],
  exports: [UnitMotorService, UnitMotorQueue],
})
export class UnitMotorModule {}
