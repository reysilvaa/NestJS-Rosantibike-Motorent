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
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
  delay,
  ConnectionState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { NotificationGateway } from '../../../common/gateway/notification.gateway';
import * as qrcodeTerminal from 'qrcode-terminal';
import { Boom } from '@hapi/boom';

@Processor('transaksi')
export class TransaksiProcessor {
  private readonly logger = new Logger(TransaksiProcessor.name);
  private whatsappClient: ReturnType<typeof makeWASocket>;
  private isConnected = false;
  private sessionPath: string;
  private connectingPromise: Promise<void> | null = null;
  private store: ReturnType<typeof makeInMemoryStore>;

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {
    this.sessionPath = process.env.BAILEYS_SESSION_PATH || './whatsapp-sessions';

    // Pastikan direktori session ada
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    this.store = makeInMemoryStore({});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.initWhatsApp();
  }

  async initWhatsApp() {
    try {
      this.logger.log('Initializing WhatsApp client');

      if (this.connectingPromise) {
        await this.connectingPromise;
        return;
      }

      this.connectingPromise = this._connect();
      await this.connectingPromise;
      this.connectingPromise = null;

      this.logger.log('WhatsApp client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client', error);
      this.connectingPromise = null;
    }
  }

  private async _connect() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Buat logger untuk baileys dengan level minimal
      const logger = pino({ level: 'silent' });

      // Buat client WhatsApp
      this.whatsappClient = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger,
      });

      // Simpan state untuk digunakan nanti
      this.store.bind(this.whatsappClient.ev);

      // Event listener untuk update kredensial
      this.whatsappClient.ev.on('creds.update', saveCreds);

      // Event listener untuk koneksi
      this.whatsappClient.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Tampilkan QR code di terminal
          qrcodeTerminal.generate(qr, { small: true });
          this.logger.log('QR Code telah dihasilkan di terminal');
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

          this.logger.log(
            `Koneksi WhatsApp terputus karena ${lastDisconnect?.error?.message || 'alasan tidak diketahui'}`,
          );
          this.isConnected = false;

          if (shouldReconnect) {
            this.logger.log('Mencoba menghubungkan kembali ke WhatsApp...');
            await this.initWhatsApp();
          }
        } else if (connection === 'open') {
          this.logger.log('WhatsApp berhasil terhubung!');
          this.isConnected = true;
        }
      });
    } catch (error) {
      this.logger.error('Error while connecting to WhatsApp', error);
      throw error;
    }
  }

  private async ensureConnected() {
    if (!this.isConnected) {
      this.logger.log('WhatsApp belum terhubung, mencoba menghubungkan...');
      await this.initWhatsApp();

      // Tunggu hingga terhubung maksimal 30 detik
      let attempts = 0;
      while (!this.isConnected && attempts < 30) {
        await delay(1000);
        attempts++;
      }

      if (!this.isConnected) {
        throw new Error('Tidak dapat terhubung ke WhatsApp setelah beberapa kali percobaan');
      }
    }
  }

  private async sendWhatsAppMessage(to: string, message: string) {
    try {
      await this.ensureConnected();

      // Format nomor WhatsApp (pastikan pakai kode negara)
      const formattedNumber = to.startsWith('+') ? to.substring(1) : to;
      const whatsappId = `${formattedNumber}@s.whatsapp.net`;

      // Kirim pesan
      await this.whatsappClient.sendMessage(whatsappId, { text: message });

      this.logger.log(`Pesan WhatsApp berhasil dikirim ke ${to}`);
      return true;
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
