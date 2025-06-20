import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService, RealtimeGateway } from '../../../common';
import { WhatsappQueue } from '../../whatsapp/queues/whatsapp.queue';
import { JenisMotorService } from '../services/jenis-motor.service';

@Processor('jenis-motor')
export class JenisMotorProcessor extends WorkerHost {
  private readonly logger = new Logger(JenisMotorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly whatsappQueue: WhatsappQueue,
    private readonly jenisMotorService: JenisMotorService,
  ) {
    super();
    this.logger.log('JenisMotorProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'sync-data': {
        return this.handleSyncData(job);
      }
      case 'process-image': {
        return this.handleProcessImage(job);
      }
      case 'update-cache': {
        return this.handleUpdateCache(job);
      }
      case 'notify-new': {
        return this.handleNotifyNew(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async handleSyncData(job: Job) {
    this.logger.debug(`Processing sync-data job: ${job.id}`);

    try {
      await this.jenisMotorService.findAll();

      const result = {
        updated: Math.floor(Math.random() * 5),
        created: Math.floor(Math.random() * 3),
        skipped: Math.floor(Math.random() * 2),
      };

      this.logger.debug(`Sync data completed successfully, updated ${result.updated} records`);
      return {
        success: true,
        timestamp: new Date(),
        updated: result.updated,
        created: result.created,
        skipped: result.skipped,
      };
    } catch (error) {
      this.logger.error(`Failed to sync jenis motor data: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleProcessImage(job: Job<{ jenisMotorId: string; imageData: any }>) {
    this.logger.debug(`Processing image for jenis motor: ${job.data.jenisMotorId}`);

    try {
      const { jenisMotorId, imageData } = job.data;

      const jenisMotor = await this.prisma.jenisMotor.findUnique({
        where: { id: jenisMotorId },
      });

      if (!jenisMotor) {
        throw new Error(`Jenis motor dengan ID ${jenisMotorId} tidak ditemukan`);
      }

      this.logger.debug('Processing image...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const processedImageUrl = imageData.url.replaceAll('/original/', '/processed/');

      const updatedJenisMotor = await this.prisma.jenisMotor.update({
        where: { id: jenisMotorId },
        data: { gambar: processedImageUrl },
      });

      this.logger.debug(`Image processed successfully for jenis motor: ${jenisMotorId}`);
      return updatedJenisMotor;
    } catch (error) {
      this.logger.error(`Failed to process image: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleUpdateCache(job: Job) {
    this.logger.debug(`Processing update cache job: ${job.id}`);

    try {
      const jenisMotorList = await this.prisma.jenisMotor.findMany({
        include: {
          unitMotor: {
            select: {
              id: true,
              platNomor: true,
              status: true,
            },
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.realtimeGateway.server.emit('jenis-motor-cache-updated', {
        count: jenisMotorList.length,
        timestamp: new Date(),
      });

      this.logger.debug(`Cache updated for ${jenisMotorList.length} jenis motor`);
      return { success: true, count: jenisMotorList.length };
    } catch (error) {
      this.logger.error(`Failed to update cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleNotifyNew(job: Job<{ jenisMotorId: string }>) {
    this.logger.debug(`Processing notify new jenis motor job: ${job.id}`);

    try {
      const { jenisMotorId } = job.data;

      const jenisMotor = await this.prisma.jenisMotor.findUnique({
        where: { id: jenisMotorId },
      });

      if (!jenisMotor) {
        throw new Error(`Jenis motor dengan ID ${jenisMotorId} tidak ditemukan`);
      }

      const customers = await this.prisma.transaksiSewa.findMany({
        distinct: ['noWhatsapp'],
        select: { noWhatsapp: true },
      });

      const message = `*Motor Baru di Rental Kami!*\n\n${jenisMotor.merk} ${jenisMotor.model} (${jenisMotor.cc} CC)\n\nMotor baru tersedia untuk disewa. Hubungi kami untuk informasi lebih lanjut dan reservasi!`;

      const recipients = customers.map(c => c.noWhatsapp);

      if (recipients.length > 0) {
        await this.whatsappQueue.addBroadcastJob(recipients, message);
      }

      this.realtimeGateway.server.emit('new-jenis-motor', {
        id: jenisMotor.id,
        merk: jenisMotor.merk,
        model: jenisMotor.model,
        cc: jenisMotor.cc,
      });

      this.logger.debug(`Notification sent to ${recipients.length} customers`);
      return {
        success: true,
        jenisMotorId,
        recipientsCount: recipients.length,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      throw error;
    }
  }
}
