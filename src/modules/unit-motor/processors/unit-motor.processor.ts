import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CloudinaryService } from '../../../common/modules/cloudinary/services/cloudinary.service';
import { RealtimeGateway, PrismaService, MotorStatus } from '../../../common';
import { WhatsappQueue } from '../../whatsapp/queues/whatsapp.queue';
import { MotorStatusType } from '../../../common/interfaces/enum';

@Processor('unit-motor')
export class UnitMotorProcessor extends WorkerHost {
  private readonly logger = new Logger(UnitMotorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly whatsappQueue: WhatsappQueue,
  ) {
    super();
    this.logger.log('UnitMotorProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'sync-data': {
        return this.handleSyncData(job);
      }
      case 'maintenance-reminder': {
        return this.handleMaintenanceReminder(job);
      }
      case 'update-status': {
        return this.handleUpdateStatus(job);
      }
      case 'process-images': {
        return this.handleProcessImages(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async handleSyncData(job: Job) {
    this.logger.debug(`Processing sync data job: ${job.id}`);

    try {
      const unitMotors = await this.prisma.unitMotor.findMany({
        include: {
          jenis: true,
        },
      });

      const incompleteUnits = unitMotors.filter(unit => !unit.platNomor);

      if (incompleteUnits.length > 0) {
        this.logger.warn(`Found ${incompleteUnits.length} units with incomplete data`);

        this.realtimeGateway.sendToAll('motor-status-update', {
          id: 'system',
          status: null,
          platNomor: 'System',
          message: `${incompleteUnits.length} unit motor memiliki data yang tidak lengkap: ${incompleteUnits.map(u => u.platNomor || 'No Plat Kosong').join(', ')}`,
        });
      }

      this.logger.debug(`Sync completed for ${unitMotors.length} units`);
      return { syncedUnits: unitMotors.length, incompleteUnits: incompleteUnits.length };
    } catch (error) {
      this.logger.error(`Failed to sync data: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleMaintenanceReminder(job: Job<{ unitMotorId: string }>) {
    this.logger.debug(`Processing maintenance reminder job: ${job.id}`);

    try {
      const { unitMotorId } = job.data;

      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
        include: {
          jenis: true,
        },
      });

      if (!unitMotor) {
        throw new Error(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      const admin = await this.prisma.admin.findFirst();

      if (!admin) {
        throw new Error('Tidak ada admin yang ditemukan untuk notifikasi');
      }

      const adminPhone = '628123456789';
      const message = `*Pengingat Maintenance Unit Motor*
      
Plat Nomor: ${unitMotor.platNomor}
Jenis: ${unitMotor.jenis.merk} ${unitMotor.jenis.model}
      
Unit ini memerlukan pemeriksaan dan maintenance rutin. Harap dijadwalkan dalam waktu dekat.`;

      await this.whatsappQueue.addSendMessageJob(adminPhone, message);

      this.realtimeGateway.sendToAll('motor-status-update', {
        id: unitMotorId,
        status: unitMotor.status,
        platNomor: unitMotor.platNomor,
        message: `Unit motor ${unitMotor.platNomor} memerlukan maintenance rutin`,
      });

      this.logger.debug(`Maintenance reminder sent for unit: ${unitMotor.platNomor}`);
      return { success: true, unitMotorId };
    } catch (error) {
      this.logger.error(`Failed to send maintenance reminder: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleUpdateStatus(job: Job<{ unitMotorId: string; status: string }>) {
    this.logger.debug(`Processing update status job: ${job.id}`);

    try {
      const { unitMotorId, status } = job.data;

      if (!Object.values(MotorStatus).includes(status as MotorStatusType)) {
        throw new Error(`Status tidak valid: ${status}`);
      }

      const updatedUnit = await this.prisma.unitMotor.update({
        where: { id: unitMotorId },
        data: { status: status as MotorStatusType },
        include: {
          jenis: true,
        },
      });

      this.realtimeGateway.sendToAll('motor-status-update', {
        id: updatedUnit.id,
        status: updatedUnit.status as MotorStatusType,
        platNomor: updatedUnit.platNomor,
        message: `Status unit motor ${updatedUnit.platNomor} berubah menjadi ${updatedUnit.status}`,
      });

      this.logger.debug(`Status updated for unit ${updatedUnit.platNomor}: ${updatedUnit.status}`);
      return updatedUnit;
    } catch (error) {
      this.logger.error(`Failed to update status: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleProcessImages(job: Job<{ unitMotorId: string; images: string[] }>) {
    this.logger.debug(`Processing images for unit: ${job.data.unitMotorId}`);

    try {
      const { unitMotorId, images } = job.data;

      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new Error(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      const processedImages = images.map(img => {
        return img.replaceAll('/original/', '/processed/');
      });

      this.logger.debug(
        `Processed ${processedImages.length} images for unit ${unitMotor.platNomor}`,
      );

      this.realtimeGateway.sendToAll('motor-status-update', {
        id: unitMotorId,
        status: unitMotor.status,
        platNomor: unitMotor.platNomor,
        message: `Pemrosesan gambar untuk unit ${unitMotor.platNomor} selesai`,
      });

      return {
        unitMotorId,
        platNomor: unitMotor.platNomor,
        processedImages,
      };
    } catch (error) {
      this.logger.error(`Failed to process images: ${error.message}`, error.stack);
      throw error;
    }
  }
}
