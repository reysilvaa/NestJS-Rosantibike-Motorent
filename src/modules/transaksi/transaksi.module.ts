import { Module } from '@nestjs/common';
import { TransaksiController } from './controllers/transaksi.controller';
import { TransaksiService } from './services/transaksi.service';
import { UnitMotorModule } from '../unit-motor/unit-motor.module';
import { BullModule } from '@nestjs/bull';
import { TransaksiProcessor } from './processors/transaksi.processor';
import { GatewayModule } from '../../common/gateway/gateway.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    UnitMotorModule,
    GatewayModule,
    BullModule.registerQueue({
      name: 'transaksi',
    }),
    WhatsappModule,
  ],
  controllers: [TransaksiController],
  providers: [TransaksiService, TransaksiProcessor],
  exports: [TransaksiService],
})
export class TransaksiModule {}
