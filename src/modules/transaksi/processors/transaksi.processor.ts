import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  PrismaService,
  StatusMotor,
  StatusTransaksi,
  TransaksiWithRelations,
} from '../../../common';
import * as fs from 'fs';
import { delay } from 'baileys';
import { NotificationGateway } from '../../../common/gateway/notification.gateway';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';

@Processor('transaksi')
export class TransaksiProcessor {
  private readonly logger = new Logger(TransaksiProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private whatsappService: WhatsappService,
  ) {
    this.logger.log('TransaksiProcessor initialized');
  }

  private async sendWhatsAppMessage(to: string, message: string) {
    try {
      // Format nomor WhatsApp (pastikan pakai kode negara)
      const formattedNumber = to.startsWith('+') ? to.substring(1) : to;
      const whatsappId = `${formattedNumber}@s.whatsapp.net`;

      // Kirim pesan menggunakan WhatsappService
      const result = await this.whatsappService.sendMessage(whatsappId, message);

      this.logger.log(`Pesan WhatsApp berhasil dikirim ke ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`Gagal mengirim pesan WhatsApp ke ${to}`, error);
      return false;
    }
  }

  @Process('notifikasi-booking')
  async handleNotifikasiBooking(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses notifikasi booking: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Mock data untuk testing
      const transaksi = (await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
      })) as unknown as TransaksiWithRelations;

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      const message = this.generateBookingMessage(transaksi);

      this.logger.log(`Mengirim WhatsApp ke ${transaksi.noWhatsapp}: ${message}`);

      // Kirim pesan WhatsApp
      await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

      this.logger.debug('Notifikasi booking berhasil dikirim');
    } catch (error) {
      this.logger.error('Gagal mengirim notifikasi booking', error);
    }
  }

  @Process('kirim-pengingat-pengembalian')
  async handlePengingatPengembalian(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses pengingat pengembalian: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Mock data untuk testing
      const transaksi = (await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
      })) as unknown as TransaksiWithRelations;

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      // Periksa apakah transaksi masih aktif
      if (transaksi.status !== StatusTransaksi.AKTIF) {
        this.logger.log(`Transaksi ${transaksiId} sudah tidak aktif, pengingat tidak dikirim`);
        return;
      }

      const message = this.generateReminderMessage(transaksi);

      this.logger.log(`Mengirim pengingat WhatsApp ke ${transaksi.noWhatsapp}: ${message}`);

      // Kirim pesan WhatsApp
      await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

      this.logger.debug('Pengingat pengembalian berhasil dikirim');
    } catch (error) {
      this.logger.error('Gagal mengirim pengingat pengembalian', error);
    }
  }

  @Process('cek-overdue')
  async handleCekOverdue(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses cek overdue: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Mock data untuk testing
      const transaksi = (await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
      })) as unknown as TransaksiWithRelations;

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
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
        const message = this.generateOverdueMessage(transaksi);
        await this.sendWhatsAppMessage(transaksi.noWhatsapp, message);

        // Kirim notifikasi real-time ke admin
        this.notificationGateway.sendOverdueNotification({
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

  @Process('kirim-notifikasi-selesai')
  async handleNotifikasiSelesai(job: Job<{ transaksiId: string }>) {
    this.logger.debug(`Memproses notifikasi selesai: ${job.data.transaksiId}`);

    try {
      const { transaksiId } = job.data;

      // Mock data untuk testing
      const transaksi = (await this.prisma.transaksiSewa.findUnique({
        where: { id: transaksiId },
      })) as unknown as TransaksiWithRelations;

      if (!transaksi) {
        this.logger.error(`Transaksi ${transaksiId} tidak ditemukan`);
        return;
      }

      const message = this.generateCompletionMessage(transaksi);

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

  // Helper methods untuk format pesan
  private generateBookingMessage(transaksi: TransaksiWithRelations): string {
    const unitMotor = transaksi.unitMotor;
    const jenis = unitMotor.jenis;
    const tanggalMulai = new Date(transaksi.tanggalMulai);
    const tanggalSelesai = new Date(transaksi.tanggalSelesai);

    return `Halo *${transaksi.namaPenyewa}*!

Terima kasih telah melakukan pemesanan di Rental Motor kami.

Detail Pemesanan:
🏍️ Motor: ${jenis.merk} ${jenis.model} (${unitMotor.platNomor})
📆 Tanggal Sewa: ${tanggalMulai.toLocaleDateString('id-ID')}
📆 Tanggal Kembali: ${tanggalSelesai.toLocaleDateString('id-ID')}
💰 Total Biaya: Rp ${Number(transaksi.totalBiaya).toLocaleString('id-ID')}

Silakan ambil motor pada tanggal yang sudah ditentukan. Jangan lupa bawa KTP dan SIM yang masih berlaku.

Terima kasih!`;
  }

  private generateReminderMessage(transaksi: TransaksiWithRelations): string {
    const unitMotor = transaksi.unitMotor;
    const jenis = unitMotor.jenis;
    const tanggalSelesai = new Date(transaksi.tanggalSelesai);

    return `Halo *${transaksi.namaPenyewa}*!

Pengingat bahwa masa sewa motor:
🏍️ ${jenis.merk} ${jenis.model} (${unitMotor.platNomor})

Akan berakhir hari ini pada pukul ${tanggalSelesai.getHours()}:${String(tanggalSelesai.getMinutes()).padStart(2, '0')}.

Harap kembalikan tepat waktu untuk menghindari biaya keterlambatan.

Terima kasih!`;
  }

  private generateOverdueMessage(transaksi: TransaksiWithRelations): string {
    const unitMotor = transaksi.unitMotor;
    const jenis = unitMotor.jenis;
    const tanggalSelesai = new Date(transaksi.tanggalSelesai);

    return `*PEMBERITAHUAN PENTING*

Halo *${transaksi.namaPenyewa}*,

Motor ${jenis.merk} ${jenis.model} (${unitMotor.platNomor}) yang Anda sewa telah melewati batas waktu pengembalian (${tanggalSelesai.toLocaleString('id-ID')}).

Status sewa Anda sekarang adalah *TERLAMBAT (OVERDUE)*.

Mohon segera kembalikan motor tersebut untuk menghindari biaya keterlambatan yang lebih tinggi. Biaya keterlambatan akan dihitung per jam.

Terima kasih atas pengertian dan kerjasamanya.`;
  }

  private generateAdminOverdueMessage(transaksi: TransaksiWithRelations): string {
    const unitMotor = transaksi.unitMotor;
    const jenis = unitMotor.jenis;
    const tanggalSelesai = new Date(transaksi.tanggalSelesai);

    return `*NOTIFIKASI OVERDUE*

Penyewa: ${transaksi.namaPenyewa} (${transaksi.noWhatsapp})
Motor: ${jenis.merk} ${jenis.model} (${unitMotor.platNomor})
Batas Waktu: ${tanggalSelesai.toLocaleString('id-ID')}
Status: OVERDUE

Motor belum dikembalikan lebih dari 1 jam dari batas waktu. Status otomatis diubah menjadi OVERDUE.`;
  }

  private generateCompletionMessage(transaksi: TransaksiWithRelations): string {
    const unitMotor = transaksi.unitMotor;
    const jenis = unitMotor.jenis;

    return `Halo *${transaksi.namaPenyewa}*!

Terima kasih telah mengembalikan motor *${jenis.merk} ${jenis.model}* (${unitMotor.platNomor}) dengan baik.

Status sewa Anda telah diubah menjadi *SELESAI*.

Kami harap Anda puas dengan layanan kami. Jangan ragu untuk menyewa kembali di lain waktu.

Terima kasih!`;
  }
}
