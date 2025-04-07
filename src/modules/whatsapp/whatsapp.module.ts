import { Module } from '@nestjs/common';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappController } from './controllers/whatsapp.controller';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { WhatsappQueue } from './queues/whatsapp.queue';
import { WhatsappProcessor } from './processors/whatsapp.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappQueue, WhatsappProcessor],
  exports: [WhatsappService, WhatsappQueue],
})
export class WhatsappModule {}
