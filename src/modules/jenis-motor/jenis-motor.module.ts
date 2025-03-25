import { Module } from '@nestjs/common';
import { JenisMotorController } from './controllers/jenis-motor.controller';
import { JenisMotorService } from './services/jenis-motor.service';
import { PrismaModule } from '../../common';

@Module({
  imports: [PrismaModule],
  controllers: [JenisMotorController],
  providers: [JenisMotorService],
  exports: [JenisMotorService],
})
export class JenisMotorModule {}
