import { Module } from '@nestjs/common';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappController } from './controllers/whatsapp.controller';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { WhatsappQueue } from './queues/whatsapp.queue';
import { WhatsappProcessor } from './processors/whatsapp.processor';
import { WhatsappConnectionService } from './services/whatsapp-connection.service';
import { WhatsappMessagingService } from './services/whatsapp-messaging.service';
import { WhatsappHandlerService } from './services/whatsapp-handler.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappConnectionService,
    WhatsappMessagingService,
    WhatsappHandlerService,
    WhatsappQueue,
    WhatsappProcessor,
  ],
  exports: [WhatsappService, WhatsappQueue],
})
export class WhatsappModule {}
