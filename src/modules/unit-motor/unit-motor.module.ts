import { Module } from '@nestjs/common';
import { UnitMotorController } from './controllers/unit-motor.controller';
import { UnitMotorService } from './services/unit-motor.service';

@Module({
  controllers: [UnitMotorController],
  providers: [UnitMotorService],
  exports: [UnitMotorService],
})
export class UnitMotorModule {}
