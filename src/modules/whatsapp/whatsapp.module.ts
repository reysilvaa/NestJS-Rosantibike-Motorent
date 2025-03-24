import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
