import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WhatsappQueue } from '../../whatsapp/queues/whatsapp.queue';
import { NotificationGateway } from '../../../common/gateway/notification.gateway';
import { StatusMotor } from '../../../common/enums/status.enum';

@Processor('unit-motor')
export class UnitMotorProcessor {
  private readonly logger = new Logger(UnitMotorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsappQueue: WhatsappQueue,
    private notificationGateway: NotificationGateway,
  ) {
    this.logger.log('UnitMotorProcessor initialized');
  }

  @Process('sync-data')
  async handleSyncData(job: Job) {
    this.logger.debug(`Processing sync data job: ${job.id}`);

    try {
      // Logika sinkronisasi data unit motor
      // Misalnya, memeriksa kekonsistenan data
      const unitMotors = await this.prisma.unitMotor.findMany({
        include: {
          jenis: true,
        },
      });

      // Contoh logika: periksa apakah semua unit motor memiliki nomor plat
      const incompleteUnits = unitMotors.filter(unit => !unit.platNomor);

      if (incompleteUnits.length > 0) {
        this.logger.warn(`Found ${incompleteUnits.length} units with incomplete data`);

        // Notifikasi admin melalui WebSocket
        this.notificationGateway.sendToAll('motor-status-update', {
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

  @Process('maintenance-reminder')
  async handleMaintenanceReminder(job: Job<{ unitMotorId: string }>) {
    this.logger.debug(`Processing maintenance reminder job: ${job.id}`);

    try {
      const { unitMotorId } = job.data;

      // Dapatkan informasi unit motor
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
        include: {
          jenis: true,
        },
      });

      if (!unitMotor) {
        throw new Error(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      // Dapatkan informasi admin
      const admin = await this.prisma.admin.findFirst();

      if (!admin) {
        throw new Error('Tidak ada admin yang ditemukan untuk notifikasi');
      }

      // Kirim notifikasi maintenance ke admin (simulasi nomor WhatsApp admin)
      const adminPhone = '628123456789'; // Nomor admin dalam contoh
      const message = `*Pengingat Maintenance Unit Motor*
      
Plat Nomor: ${unitMotor.platNomor}
Jenis: ${unitMotor.jenis.merk} ${unitMotor.jenis.model}
      
Unit ini memerlukan pemeriksaan dan maintenance rutin. Harap dijadwalkan dalam waktu dekat.`;

      // Kirim pesan via WhatsApp
      await this.whatsappQueue.addSendMessageJob(adminPhone, message);

      // Kirim notifikasi melalui WebSocket
      this.notificationGateway.sendToAll('motor-status-update', {
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

  @Process('update-status')
  async handleUpdateStatus(job: Job<{ unitMotorId: string; status: string }>) {
    this.logger.debug(`Processing update status job: ${job.id}`);

    try {
      const { unitMotorId, status } = job.data;

      // Validasi status
      if (!Object.values(StatusMotor).includes(status as StatusMotor)) {
        throw new Error(`Status tidak valid: ${status}`);
      }

      // Update status unit motor
      const updatedUnit = await this.prisma.unitMotor.update({
        where: { id: unitMotorId },
        data: { status: status as StatusMotor },
        include: {
          jenis: true,
        },
      });

      // Kirim notifikasi melalui WebSocket
      this.notificationGateway.sendToAll('motor-status-update', {
        id: updatedUnit.id,
        status: updatedUnit.status as StatusMotor,
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

  @Process('process-images')
  async handleProcessImages(job: Job<{ unitMotorId: string; images: string[] }>) {
    this.logger.debug(`Processing images for unit: ${job.data.unitMotorId}`);

    try {
      const { unitMotorId, images } = job.data;

      // Dapatkan informasi unit motor
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new Error(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      // Simulasi pemrosesan gambar
      const processedImages = images.map(img => {
        // Simulasi proses resize dan watermark
        return img.replaceAll('/original/', '/processed/');
      });

      // Update gambar unit motor (dalam contoh ini, kita hanya log)
      this.logger.debug(
        `Processed ${processedImages.length} images for unit ${unitMotor.platNomor}`,
      );

      // Kirim notifikasi
      this.notificationGateway.sendToAll('motor-status-update', {
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
