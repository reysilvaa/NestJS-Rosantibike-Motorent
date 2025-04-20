import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { TransaksiWithRelations } from '../../../common';
import { PrismaService, StatusMotor, StatusTransaksi, RealtimeGateway } from '../../../common';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';

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

      const message = this.generateBookingMessage(transaksi as any);

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

      const message = this.generateReminderMessage(transaksi as any);

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
        const message = this.generateOverdueMessage(transaksi as any);
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

      const message = this.generateCompletionMessage(transaksi as any);

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

*MENU LAYANAN WHATSAPP*:
Ketik salah satu opsi berikut:
1️⃣ *Lunasi DP* - Informasi pembayaran DP
2️⃣ *Cek Info Saya* - Detail booking Anda
3️⃣ *Perpanjang Sewa* - Perpanjang waktu sewa
4️⃣ *Bantuan* - Menu bantuan tambahan

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

*MENU LAYANAN WHATSAPP*:
Ketik salah satu opsi berikut:
1️⃣ *Lunasi DP* - Informasi pembayaran DP
2️⃣ *Cek Info Saya* - Detail booking Anda
3️⃣ *Perpanjang Sewa* - Perpanjang waktu sewa
4️⃣ *Bantuan* - Menu bantuan tambahan

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

*MENU LAYANAN WHATSAPP*:
Ketik salah satu opsi berikut:
2️⃣ *Cek Info Saya* - Detail booking dan denda Anda
3️⃣ *Perpanjang Sewa* - Perpanjang waktu sewa
4️⃣ *Bantuan* - Hubungi admin

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

*MENU LAYANAN WHATSAPP*:
Ketik salah satu opsi berikut:
2️⃣ *Cek Info Saya* - Detail booking terakhir Anda
4️⃣ *Bantuan* - Bantuan lebih lanjut

Terima kasih!`;
  }
}
