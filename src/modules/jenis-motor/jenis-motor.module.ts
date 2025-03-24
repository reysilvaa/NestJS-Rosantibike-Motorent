import { Module } from '@nestjs/common';
import { JenisMotorController } from './controllers/jenis-motor.controller';
import { JenisMotorService } from './services/jenis-motor.service';

@Module({
  controllers: [JenisMotorController],
  providers: [JenisMotorService],
})
export class JenisMotorModule {}
