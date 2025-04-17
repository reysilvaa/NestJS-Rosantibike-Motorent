import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappService } from '../services/whatsapp.service';

interface SendResult {
  to: string;
  success: boolean;
  result?: any;
  error?: string;
}

@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private whatsappService: WhatsappService) {
    this.logger.log('WhatsappProcessor initialized');
  }

  @Process('send-message')
  async handleSendMessage(job: Job<{ to: string; message: string; options?: any }>) {
    this.logger.debug(`Processing send message job: ${job.id}`);

    try {
      const { to, message, options } = job.data;

      // Format nomor WhatsApp (pastikan pakai kode negara)
      const formattedNumber = to.startsWith('+') ? to.slice(1) : to;
      const whatsappId = `${formattedNumber}@s.whatsapp.net`;

      // Kirim pesan menggunakan WhatsappService
      const result = await this.whatsappService.sendMessage(whatsappId, message);

      this.logger.debug(`Message sent successfully to ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('init-session')
  async handleInitSession(job: Job) {
    this.logger.debug(`Processing init session job: ${job.id}`);

    try {
      // Inisialisasi sesi WhatsApp
      await this.whatsappService.initialize();

      this.logger.debug('WhatsApp session initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('start-all-sessions')
  async handleStartAllSessions(job: Job) {
    this.logger.debug(`Processing start all sessions job: ${job.id}`);

    try {
      const result = await this.whatsappService.startAllSessions();
      this.logger.debug('Started all WhatsApp sessions successfully');
      return result;
    } catch (error) {
      this.logger.error(`Failed to start all WhatsApp sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('get-chats')
  async handleGetChats(job: Job) {
    this.logger.debug(`Processing get chats job: ${job.id}`);

    try {
      const result = await this.whatsappService.getChats();
      this.logger.debug('Successfully retrieved chats');
      return result;
    } catch (error) {
      this.logger.error(`Failed to get chats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('broadcast-message')
  async handleBroadcastMessage(job: Job<{ recipients: string[]; message: string; options?: any }>) {
    this.logger.debug(`Processing broadcast message job: ${job.id}`);

    try {
      const { recipients, message, options } = job.data;

      // Mendapatkan jumlah penerima
      const totalRecipients = recipients.length;
      this.logger.log(`Sending broadcast message to ${totalRecipients} recipients`);

      // Buat array untuk menyimpan hasil
      const results: SendResult[] = [];

      // Kirim pesan ke setiap penerima dengan delay untuk menghindari flood
      for (let i = 0; i < totalRecipients; i++) {
        const to = recipients[i];

        // Format nomor WhatsApp
        const formattedNumber = to.startsWith('+') ? to.slice(1) : to;
        const whatsappId = `${formattedNumber}@s.whatsapp.net`;

        try {
          // Kirim pesan
          const result = await this.whatsappService.sendMessage(whatsappId, message);
          results.push({ to, success: true, result });

          // Log progress
          this.logger.debug(`Sent to ${to} (${i + 1}/${totalRecipients})`);

          // Delay antara pesan untuk menghindari rate limiting
          if (i < totalRecipients - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          this.logger.error(`Failed to send to ${to}: ${error.message}`);
          results.push({ to, success: false, error: error.message });
        }
      }

      this.logger.debug('Broadcast message job completed');
      return {
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to process broadcast message job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
