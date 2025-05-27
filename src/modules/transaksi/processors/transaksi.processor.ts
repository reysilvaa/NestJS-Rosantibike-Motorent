import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService, StatusMotor, StatusTransaksi, RealtimeGateway } from '../../../common';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';
import * as whatsappMenu from '../../../common/helpers/whatsapp-menu.helper';

@Processor('transaksi')
export class TransaksiProcessor extends WorkerHost {
  private readonly logger = new Logger(TransaksiProcessor.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private whatsappService: WhatsappService,
  ) {
    super();
    this.logger.log('TransaksiProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'notifikasi-booking': {
        return this.handleNotifikasiBooking(job);
      }
      case 'kirim-pengingat-pengembalian': {
        return this.handlePengingatPengembalian(job);
      }
      case 'cek-overdue': {
        return this.handleCekOverdue(job);
      }
      case 'kirim-notifikasi-selesai': {
        return this.handleNotifikasiSelesai(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async sendWhatsAppMessage(to: string, message: string) {
    try {
      // Gunakan nomor WhatsApp langsung karena sudah diformat saat disimpan ke database
      // whatsapp-messaging.service.ts akan menambahkan @s.whatsapp.net jika belum ada

      // Kirim pesan menggunakan WhatsappService
      const result = await this.whatsappService.sendMessage(to, message);

      this.logger.log(`Pesan WhatsApp berhasil dikirim ke ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`Gagal mengirim pesan WhatsApp ke ${to}`, error);
      return false;
    }
  }

  private async handleNotifikasiBooking(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses notifikasi booking: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Get full transaction data including relationships
      const transaksi = await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      if (!transaksi.unitMotor || !transaksi.unitMotor.jenis) {
        this.logger.error(
          `Data unit motor atau jenis tidak ditemukan untuk transaksi ${transaksiId}`,
        );
        return;
      }

      const message = whatsappMenu.getBookingNotificationTemplate(transaksi);

      this.logger.log(`Mengirim WhatsApp ke ${transaksi.noWhatsapp}: ${message}`);

      // Kirim pesan WhatsApp
      await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

      this.logger.debug('Notifikasi booking berhasil dikirim');
    } catch (error) {
      this.logger.error('Gagal mengirim notifikasi booking', error);
    }
  }

  private async handlePengingatPengembalian(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses pengingat pengembalian: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Get full transaction data including relationships
      const transaksi = await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      if (!transaksi.unitMotor || !transaksi.unitMotor.jenis) {
        this.logger.error(
          `Data unit motor atau jenis tidak ditemukan untuk transaksi ${transaksiId}`,
        );
        return;
      }

      // Periksa apakah transaksi masih aktif
      if (transaksi.status !== StatusTransaksi.AKTIF) {
        this.logger.log(`Transaksi ${transaksiId} sudah tidak aktif, pengingat tidak dikirim`);
        return;
      }

      const message = whatsappMenu.getReminderNotificationTemplate(transaksi);

      this.logger.log(`Mengirim pengingat WhatsApp ke ${transaksi.noWhatsapp}: ${message}`);

      // Kirim pesan WhatsApp
      await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

      this.logger.debug('Pengingat pengembalian berhasil dikirim');
    } catch (error) {
      this.logger.error('Gagal mengirim pengingat pengembalian', error);
    }
  }

  private async handleCekOverdue(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses cek overdue: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Get full transaction data including relationships
      const transaksi = await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      if (!transaksi.unitMotor || !transaksi.unitMotor.jenis) {
        this.logger.error(
          `Data unit motor atau jenis tidak ditemukan untuk transaksi ${transaksiId}`,
        );
        return;
      }

      // Periksa apakah transaksi masih aktif dan belum dikembalikan
      if (transaksi.status !== StatusTransaksi.AKTIF) {
        this.logger.log(
          `Transaksi ${transaksiId} sudah selesai atau dibatalkan, tidak perlu cek overdue`,
        );
        return;
      }

      const now = new Date();
      const tanggalSelesai = new Date(transaksi.tanggalSelesai);

      // Jika sudah melewati waktu pengembalian
      if (now > tanggalSelesai) {
        this.logger.log(`Transaksi ${transaksiId} overdue, update status`);

        // Update status transaksi menjadi OVERDUE
        await this.prisma.transaksiSewa.update({
          where: { id: transaksiId },
          data: { status: StatusTransaksi.OVERDUE },
        });

        // Update status motor menjadi OVERDUE
        await this.prisma.unitMotor.update({
          where: { id: transaksi.unitId },
          data: { status: StatusMotor.OVERDUE },
        });

        // Kirim notifikasi WhatsApp
        const message = whatsappMenu.getOverdueNotificationTemplate(transaksi);
        await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

        // Kirim notifikasi real-time ke admin
        this.realtimeGateway.sendToAll('overdue-transaction', {
          id: transaksiId,
          unitMotor: {
            id: transaksi.unitMotor.id,
            platNomor: transaksi.unitMotor.platNomor,
            jenis: transaksi.unitMotor.jenis,
          },
          namaPenyewa: transaksi.namaPenyewa,
          noWhatsapp: transaksi.noWhatsapp,
          tanggalSelesai: transaksi.tanggalSelesai,
          message: `Unit motor ${transaksi.unitMotor.platNomor} telah melewati batas waktu pengembalian!`,
        });
      }
    } catch (error) {
      this.logger.error('Gagal melakukan cek overdue', error);
    }
  }

  private async handleNotifikasiSelesai(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses notifikasi selesai: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Get full transaction data including relationships
      const transaksi = await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      if (!transaksi.unitMotor || !transaksi.unitMotor.jenis) {
        this.logger.error(
          `Data unit motor atau jenis tidak ditemukan untuk transaksi ${transaksiId}`,
        );
        return;
      }

      const message = whatsappMenu.getCompletionNotificationTemplate(transaksi);

      this.logger.log(
        `Mengirim notifikasi selesai WhatsApp ke ${transaksi.noWhatsapp}: ${message}`,
      );

      // Kirim pesan WhatsApp
      await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

      this.logger.debug('Notifikasi selesai berhasil dikirim');
    } catch (error) {
      this.logger.error('Gagal mengirim notifikasi selesai', error);
    }
  }
}
