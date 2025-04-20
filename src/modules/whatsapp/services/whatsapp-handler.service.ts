import { Injectable, Logger } from '@nestjs/common';
import { WhatsappMessagingService } from './whatsapp-messaging.service';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import * as whatsappMenu from '../../../common/helpers/whatsapp-menu.helper';
import { formatWhatsappNumber } from '../../../common/helpers/whatsapp-formatter.helper';

@Injectable()
export class WhatsappHandlerService {
  private readonly logger = new Logger(WhatsappHandlerService.name);

  constructor(
    private readonly connectionService: WhatsappConnectionService,
    private readonly messagingService: WhatsappMessagingService,
  ) {}

  /**
   * Memproses pesan masuk dari pengguna WhatsApp
   */
  async processIncomingMessage(from: string, message: string, messageData: any) {
    try {
      // Abaikan semua pesan dari diri sendiri (fromMe=true)
      if (messageData && messageData.fromMe === true) {
        this.logger.log(`[INCOMING] Mengabaikan pesan dari diri sendiri: ${from}`);
        return;
      }

      this.logger.log(`[INCOMING] Menerima pesan dari ${from}: "${message}"`);
      this.logger.log(`[INCOMING] Data pesan: ${JSON.stringify(messageData)}`);

      // Format nomor pengirim untuk penyimpanan di database
      const formattedNumber = formatWhatsappNumber(from);
      this.logger.log(`[INCOMING] Nomor diformat menjadi: ${formattedNumber}`);

      // Gunakan nomor pengirim asli untuk pengiriman pesan
      const senderNumber = from;

      // Cari transaksi terkait dengan nomor pengirim
      const prismaModule = await import('../../../common/prisma/prisma.service');
      const prismaService = new prismaModule.PrismaService();
      this.logger.log(`[INCOMING] Mencari transaksi aktif untuk nomor: ${formattedNumber}`);

      // Cari transaksi aktif untuk nomor ini (menggunakan nomor yang sudah diformat)
      const activeTransactions = await prismaService.transaksiSewa.findMany({
        where: {
          noWhatsapp: formattedNumber,
          status: {
            in: ['AKTIF', 'OVERDUE'],
          },
        },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      this.logger.log(
        `[INCOMING] Transaksi aktif ditemukan: ${activeTransactions.length > 0 ? 'Ya' : 'Tidak'}`,
      );
      if (activeTransactions.length > 0) {
        this.logger.log(
          `[INCOMING] Detail transaksi aktif: ID=${activeTransactions[0].id}, ` +
            `Motor=${activeTransactions[0].unitMotor?.jenis?.model || 'N/A'}, ` +
            `Status=${activeTransactions[0].status}, ` +
            `Penyewa=${activeTransactions[0].namaPenyewa}`,
        );
      }

      // Cek apakah pesan berisi kata kunci "menu"
      const isMenuRequest = message.toLowerCase().includes('menu');

      // Cek untuk kata kunci booking
      if (message && message.toLowerCase().includes('booking-')) {
        // Cek status booking berdasarkan kode
        this.logger.log(
          `[INCOMING] Menerima permintaan cek booking dengan kode: ${message.trim()}`,
        );
        await this.checkBookingStatus(senderNumber, message.trim(), prismaService);
        return;
      }

      // Cek apakah pesan mengandung pilihan menu bernomor
      if (message && /^[1-9]\d*$/.test(message.trim())) {
        const menuOption = parseInt(message.trim(), 10);
        this.logger.log(`[INCOMING] Klien memilih menu nomor: ${menuOption}`);

        // Proses pilihan menu - Selalu tanggapi pesan angka sebagai pilihan menu
        if (activeTransactions.length > 0) {
          // Jika ada transaksi aktif, gunakan menu transaksi aktif
          this.logger.log(
            `[INCOMING] Memproses menu transaksi aktif dengan pilihan: ${menuOption}`,
          );
          await this.processActiveTransactionMenu(activeTransactions[0], menuOption, senderNumber);
        } else {
          // Jika tidak ada transaksi aktif, tampilkan menu umum
          this.logger.log(`[INCOMING] Memproses menu umum dengan pilihan: ${menuOption}`);
          await this.processMenuSelection(senderNumber, menuOption, prismaService);
        }
        return; // Kembali setelah memproses pilihan menu
      }

      // Jika pesan berisi kata kunci "menu", tampilkan menu sesuai status
      if (isMenuRequest) {
        this.logger.log(`[INCOMING] Klien meminta menu`);
        if (activeTransactions.length > 0) {
          // Jika ada transaksi aktif, tampilkan menu transaksi
          this.logger.log(`[INCOMING] Mengirim menu transaksi aktif`);
          await this.sendActiveTransactionMenu(activeTransactions[0], senderNumber);
        } else {
          // Jika tidak ada transaksi aktif, tampilkan menu umum
          this.logger.log(`[INCOMING] Mengirim menu umum`);
          await this.sendMainMenu(senderNumber);
        }
        return; // Kembali setelah menampilkan menu
      }

      // Untuk pesan lain yang tidak dikenali (bukan menu dan bukan pilihan angka)
      this.logger.log(`[INCOMING] Pesan tidak mengandung kata kunci yang dikenali`);
      if (activeTransactions.length > 0) {
        // Jika ada transaksi aktif, berikan info transaksi
        this.logger.log(`[INCOMING] Mengirim informasi transaksi aktif`);
        await this.sendActiveTransactionInfo(activeTransactions[0], senderNumber);
      } else {
        // Jika tidak ada transaksi aktif, kirim pesan sambutan
        this.logger.log(`[INCOMING] Mengirim pesan sambutan untuk pengguna baru`);
        await this.sendWelcomeMessage(senderNumber);
      }
    } catch (error) {
      this.logger.error(`[INCOMING] Error saat memproses pesan masuk: ${error.message}`);
      this.logger.error(`[INCOMING] Stack trace: ${error.stack}`);
    }
  }

  /**
   * Mengirim menu utama ke pengguna
   */
  private async sendMainMenu(senderNumber: string) {
    const menuText = whatsappMenu.getMainMenuTemplate();
    await this.messagingService.sendMessage(senderNumber, menuText);
  }

  /**
   * Mengirim menu untuk transaksi aktif
   */
  private async sendActiveTransactionMenu(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getActiveTransactionMenuTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  /**
   * Mengirim informasi transaksi aktif
   */
  private async sendActiveTransactionInfo(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getActiveTransactionInfoTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  /**
   * Memproses menu untuk transaksi aktif
   */
  private async processActiveTransactionMenu(
    transaction: any,
    menuOption: number,
    senderNumber: string,
  ) {
    switch (menuOption) {
      case 1: {
        await this.sendPaymentInstructions(transaction, senderNumber);
        break;
      }
      case 2: {
        await this.sendActiveTransactionInfo(transaction, senderNumber);
        break;
      }
      case 3: {
        await this.sendExtensionInstructions(transaction, senderNumber);
        break;
      }
      case 4: {
        await this.sendCustomHelpMenu(senderNumber);
        break;
      }
      default: {
        await this.messagingService.sendMessage(
          senderNumber,
          'Maaf, pilihan menu tidak valid. Silakan pilih menu 1-4.',
        );
      }
    }
  }

  /**
   * Kirim instruksi pembayaran DP
   */
  private async sendPaymentInstructions(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getPaymentInstructionsTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  /**
   * Kirim instruksi perpanjangan
   */
  private async sendExtensionInstructions(transaction: any, senderNumber: string) {
    const config = this.connectionService.getConfig();
    const message = whatsappMenu.getExtensionInstructionsTemplate(transaction, config.adminNumber);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  /**
   * Memproses pilihan menu dari pengguna
   */
  private async processMenuSelection(senderNumber: string, menuOption: number, prisma: any) {
    switch (menuOption) {
      case 1: {
        await this.sendMotorList(senderNumber, prisma);
        break;
      }
      case 2: {
        await this.sendRentalPrices(senderNumber, prisma);
        break;
      }
      case 3: {
        await this.sendBookingInfo(senderNumber);
        break;
      }
      case 4: {
        await this.sendTransactionStatusInfo(senderNumber);
        break;
      }
      case 5: {
        await this.sendCustomHelpMenu(senderNumber);
        break;
      }
      default: {
        await this.messagingService.sendMessage(
          senderNumber,
          'Maaf, pilihan menu tidak valid. Silakan pilih menu 1-5.',
        );
      }
    }
  }

  /**
   * Mengirim daftar motor yang tersedia dari database
   */
  private async sendMotorList(senderNumber: string, prisma: any) {
    try {
      // Dapatkan semua jenis motor dari database
      const jenisMotor = await prisma.jenisMotor.findMany({
        include: {
          unitMotor: {
            where: {
              status: 'TERSEDIA',
            },
          },
        },
        orderBy: {
          model: 'asc',
        },
      });

      const motorListText = whatsappMenu.getMotorListTemplate(jenisMotor);
      await this.messagingService.sendMessage(senderNumber, motorListText);
    } catch (error) {
      this.logger.error(`Error mendapatkan daftar motor: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat mengambil data motor. Silakan coba lagi nanti.',
      );
    }
  }

  /**
   * Mengirim informasi harga sewa dari database
   */
  private async sendRentalPrices(senderNumber: string, prisma: any) {
    try {
      // Dapatkan semua jenis motor dari database
      const jenisMotor = await prisma.jenisMotor.findMany({
        include: {
          unitMotor: {
            where: {
              status: 'TERSEDIA',
            },
          },
        },
        orderBy: {
          model: 'asc',
        },
      });

      const priceText = whatsappMenu.getRentalPricesTemplate(jenisMotor);
      await this.messagingService.sendMessage(senderNumber, priceText);
    } catch (error) {
      this.logger.error(`Error mendapatkan data harga: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat mengambil data harga. Silakan coba lagi nanti.',
      );
    }
  }

  /**
   * Cek status booking berdasarkan kode
   */
  private async checkBookingStatus(senderNumber: string, message: string, prisma: any) {
    try {
      // Ekstrak kode booking
      const bookingCodeMatch = message.match(/booking-([\da-z]+)/i);
      if (!bookingCodeMatch || !bookingCodeMatch[1]) {
        await this.messagingService.sendMessage(
          senderNumber,
          'Format kode booking tidak valid. Gunakan format: BOOKING-[kode]',
        );
        return;
      }

      const bookingCode = bookingCodeMatch[1];

      // Cari transaksi dengan kode booking tersebut
      const transaction = await prisma.transaksiSewa.findFirst({
        where: {
          id: {
            contains: bookingCode,
            mode: 'insensitive',
          },
        },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      if (!transaction) {
        await this.messagingService.sendMessage(
          senderNumber,
          `Kode booking BOOKING-${bookingCode} tidak ditemukan. Silakan periksa kembali kode booking Anda.`,
        );
        return;
      }

      // Kirim info transaksi
      await this.sendActiveTransactionInfo(transaction, senderNumber);
    } catch (error) {
      this.logger.error(`Error memeriksa status booking: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat memeriksa status booking. Silakan coba lagi nanti.',
      );
    }
  }

  /**
   * Mengirim informasi pemesanan
   */
  private async sendBookingInfo(senderNumber: string) {
    const config = this.connectionService.getConfig();
    const bookingText = whatsappMenu.getBookingInfoTemplate(config.adminNumber);
    await this.messagingService.sendMessage(senderNumber, bookingText);
  }

  /**
   * Mengirim informasi cek status transaksi
   */
  private async sendTransactionStatusInfo(senderNumber: string) {
    try {
      // Format nomor pengirim untuk pencarian di database
      const formattedNumber = formatWhatsappNumber(senderNumber);
      this.logger.log(`[STATUS TRANSAKSI] Mencari transaksi untuk nomor: ${formattedNumber}`);

      const prismaModule = await import('../../../common/prisma/prisma.service');
      const prismaService = new prismaModule.PrismaService();

      // Cari semua transaksi untuk nomor ini
      const transactions = await prismaService.transaksiSewa.findMany({
        where: {
          noWhatsapp: formattedNumber,
        },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(
        `[STATUS TRANSAKSI] Menemukan ${transactions.length} transaksi untuk nomor ${formattedNumber}`,
      );

      if (transactions.length === 0) {
        // Tidak ada transaksi yang ditemukan
        this.logger.log(
          `[STATUS TRANSAKSI] Tidak ada transaksi ditemukan untuk nomor ${formattedNumber}`,
        );
        await this.messagingService.sendMessage(
          senderNumber,
          'Tidak ditemukan transaksi terkait dengan nomor WhatsApp Anda. Silakan hubungi admin untuk informasi lebih lanjut.',
        );
        return;
      }

      // Ada transaksi yang ditemukan
      const latestTransaction = transactions[0];
      this.logger.log(
        `[STATUS TRANSAKSI] Menampilkan transaksi terbaru: ID=${latestTransaction.id}, ` +
          `Motor=${latestTransaction.unitMotor?.jenis?.model || 'N/A'}, ` +
          `Status=${latestTransaction.status}, ` +
          `Penyewa=${latestTransaction.namaPenyewa}`,
      );

      await this.sendActiveTransactionInfo(latestTransaction, senderNumber);

      // Jika ada lebih dari 1 transaksi, beri info bahwa ada transaksi lain
      if (transactions.length > 1) {
        this.logger.log(
          `[STATUS TRANSAKSI] Mengirim info tambahan tentang ${transactions.length - 1} transaksi lainnya`,
        );
        await this.messagingService.sendMessage(
          senderNumber,
          `Anda memiliki ${transactions.length} transaksi. Info di atas adalah transaksi terbaru Anda. Untuk melihat riwayat lengkap, silakan hubungi admin.`,
        );
      }
    } catch (error) {
      this.logger.error(`[STATUS TRANSAKSI] Error mendapatkan status transaksi: ${error.message}`);
      this.logger.error(`[STATUS TRANSAKSI] Stack trace: ${error.stack}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat memeriksa status transaksi. Silakan coba lagi nanti.',
      );
    }
  }

  /**
   * Mengirim pesan bantuan khusus
   */
  private async sendCustomHelpMenu(senderNumber: string) {
    const helpText = whatsappMenu.getHelpMenuTemplate();
    await this.messagingService.sendMessage(senderNumber, helpText);
  }

  /**
   * Mengirim pesan sambutan
   */
  private async sendWelcomeMessage(senderNumber: string) {
    const welcomeText = whatsappMenu.getWelcomeMessageTemplate();
    await this.messagingService.sendMessage(senderNumber, welcomeText);
  }
}
