import { Module } from '@nestjs/common';
import { AvailabilityService } from './services/availability.service';
import { PrismaModule } from '../../common/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
