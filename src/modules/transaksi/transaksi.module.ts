import { Module } from '@nestjs/common';
import { TransaksiController } from './controllers/transaksi.controller';
import { TransaksiService } from './services/transaksi.service';
import { PrismaModule, WebsocketModule } from '../../common';
import { UnitMotorModule } from '../unit-motor/unit-motor.module';
import { BullModule } from '@nestjs/bullmq';
import { TransaksiProcessor } from './processors/transaksi.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TransaksiQueue } from './queues/transaksi.queue';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    UnitMotorModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'transaksi',
    }),
  ],
  controllers: [TransaksiController],
  providers: [TransaksiService, TransaksiProcessor, TransaksiQueue],
  exports: [TransaksiService, TransaksiQueue],
})
export class TransaksiModule {}
