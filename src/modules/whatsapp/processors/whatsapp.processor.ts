import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WhatsappService } from '../services/whatsapp.service';

interface WhatsappInitResult {
  status: string;
  qrCode?: string;
  [key: string]: any;
}

@Processor('whatsapp')
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly whatsappService: WhatsappService) {
    super();
    this.logger.log('WhatsappProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'send-message': {
        return this.handleSendMessage(job);
      }
      case 'init-session': {
        return this.handleInitSession(job);
      }
      case 'start-all-sessions': {
        return this.handleStartAllSessions(job);
      }
      case 'get-chats': {
        return this.handleGetChats(job);
      }
      case 'broadcast-message': {
        return this.handleBroadcastMessage(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async handleSendMessage(job: Job<{ to: string; message: string; session?: string }>) {
    this.logger.debug(
      `Processing send message job to ${job.data.to}, session: ${job.data.session || 'default'}`,
    );

    try {
      const phoneNumber = this.formatPhoneNumber(job.data.to);

      const result = await this.whatsappService.sendMessage(phoneNumber, job.data.message);

      this.logger.debug(
        `Message sent successfully to ${phoneNumber}, message ID: ${result?.id || 'unknown'}`,
      );

      return {
        success: !!result,
        to: phoneNumber,
        messageId: result?.id || null,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message to ${job.data.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleInitSession(job: Job<{ sessionId: string }>) {
    this.logger.debug(`Processing init session job for ${job.data.sessionId}`);

    try {
      const result = await this.whatsappService.initialize();

      let initResult: WhatsappInitResult = { status: 'error' };
      if (result) {
        initResult =
          typeof result === 'object'
            ? (result as unknown as WhatsappInitResult)
            : { status: 'unknown' };
      }

      return {
        success: !!result,
        sessionId: job.data.sessionId,
        qrCode: initResult.qrCode || null,
        status: initResult.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to init WhatsApp session ${job.data.sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleStartAllSessions(job: Job) {
    this.logger.debug(`Processing start all sessions job: ${job.id}`);

    try {
      const result = await this.whatsappService.startAllSessions();

      this.logger.debug(`Started all WhatsApp sessions`);

      return {
        success: !!result,
        result: result || { status: 'error', message: 'Failed to start sessions' },
      };
    } catch (error) {
      this.logger.error(`Failed to start all WhatsApp sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleGetChats(job: Job<{ sessionId: string }>) {
    this.logger.debug(`Processing get chats job for session ${job.data.sessionId}`);

    try {
      const chats = await this.whatsappService.getChats();

      this.logger.debug(`Retrieved ${chats?.length || 0} chats`);

      return {
        success: !!chats,
        sessionId: job.data.sessionId,
        chats: chats || [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to get chats for session ${job.data.sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleBroadcastMessage(
    job: Job<{ recipients: string[]; message: string; session?: string }>,
  ) {
    this.logger.debug(
      `Processing broadcast message job to ${job.data.recipients.length} recipients, session: ${
        job.data.session || 'default'
      }`,
    );

    try {
      const session = job.data.session || 'default';

      const results: Array<{ to: string; success: boolean; messageId: any }> = [];
      const errors: Array<{ to: string; success: boolean; error: string }> = [];

      for (const recipient of job.data.recipients) {
        try {
          const phoneNumber = this.formatPhoneNumber(recipient);

          const result = await this.whatsappService.sendMessage(phoneNumber, job.data.message);

          results.push({
            to: phoneNumber,
            success: !!result,
            messageId: result?.id || null,
          });

          this.logger.debug(
            `Broadcast message sent to ${phoneNumber}, message ID: ${result?.id || 'unknown'}`,
          );
        } catch (error) {
          errors.push({
            to: recipient,
            success: false,
            error: error.message,
          });

          this.logger.warn(`Failed to send broadcast message to ${recipient}: ${error.message}`);
        }
      }

      this.logger.debug(
        `Broadcast completed. Success: ${results.length}, Failed: ${errors.length}`,
      );

      return {
        success: true,
        session,
        totalRecipients: job.data.recipients.length,
        successCount: results.length,
        failureCount: errors.length,
        results,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to broadcast message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replaceAll(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    return cleaned;
  }
}
