import { Module } from '@nestjs/common';
import { UnitMotorController } from './controllers/unit-motor.controller';
import { UnitMotorService } from './services/unit-motor.service';
import { PrismaModule } from '../../common';

@Module({
  imports: [PrismaModule],
  controllers: [UnitMotorController],
  providers: [UnitMotorService],
  exports: [UnitMotorService],
})
export class UnitMotorModule {}
