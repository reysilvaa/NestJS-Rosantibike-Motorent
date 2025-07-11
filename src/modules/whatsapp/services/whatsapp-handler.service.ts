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

  async processIncomingMessage(from: string, message: string, messageData: any) {
    try {
      if (!this.isValidMessage(from, message, messageData)) {
        return;
      }

      this.logger.log(`[INCOMING] Menerima pesan dari ${from}: "${message}"`);

      const formattedNumber = formatWhatsappNumber(from);
      const senderNumber = from;

      const { prismaService, activeTransactions } =
        await this.initializeDataAndFindTransactions(formattedNumber);

      const normalizedMessage = message.trim().toLowerCase();

      if (
        await this.processSpecialCommands(
          normalizedMessage,
          senderNumber,
          prismaService,
          activeTransactions,
        )
      ) {
        return;
      }

      if (/^[1-9]\d*$/.test(normalizedMessage)) {
        const menuOption = parseInt(normalizedMessage, 10);
        await this.processMenuSelection(senderNumber, menuOption, prismaService);

        if (activeTransactions.length > 0 && menuOption > 0 && menuOption <= 5) {
          await this.messagingService.sendMessage(
            senderNumber,
            `Anda juga memiliki transaksi aktif. Gunakan kode A1-A4 untuk mengakses menu khusus transaksi aktif.`,
          );
        }
        return;
      }

      if (normalizedMessage.includes('menu')) {
        await this.sendMainMenu(senderNumber);

        if (activeTransactions.length > 0) {
          await this.messagingService.sendMessage(
            senderNumber,
            `Anda juga memiliki transaksi aktif. Gunakan kode A1-A4 untuk mengakses menu transaksi aktif.`,
          );
        }
        return;
      }

      await this.sendDefaultResponse(senderNumber, activeTransactions);
    } catch (error) {
      this.logger.error(`[INCOMING] Error saat memproses pesan masuk: ${error.message}`);
      this.logger.error(`[INCOMING] Stack trace: ${error.stack}`);
    }
  }

  private isValidMessage(from: string, message: string, messageData: any): boolean {
    if (!from || !message || !messageData) {
      this.logger.log(`[INCOMING] Mengabaikan pesan dengan data tidak lengkap`);
      return false;
    }

    if (messageData && messageData.fromMe === true) {
      this.logger.log(`[INCOMING] Mengabaikan pesan dari diri sendiri: ${from}`);
      return false;
    }

    if (from === '@c.us' || !from.includes('@')) {
      this.logger.log(`[INCOMING] Mengabaikan event dengan format penerima tidak valid: ${from}`);
      return false;
    }

    return true;
  }

  private async initializeDataAndFindTransactions(formattedNumber: string) {
    const prismaModule = await import('../../../common/modules/prisma/services/prisma.service');
    const prismaService = new prismaModule.PrismaService();

    const activeTransactions = await prismaService.transaksiSewa.findMany({
      where: {
        noWhatsapp: formattedNumber,
        status: { in: ['AKTIF', 'OVERDUE'] },
      },
      include: {
        unitMotor: { include: { jenis: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    this.logger.log(
      `[INCOMING] Transaksi aktif ditemukan: ${activeTransactions.length > 0 ? 'Ya' : 'Tidak'}`,
    );

    return { prismaService, activeTransactions };
  }

  private async processSpecialCommands(
    normalizedMessage: string,
    senderNumber: string,
    prismaService: any,
    activeTransactions: any[],
  ): Promise<boolean> {
    if (['listmenu', 'list menu', 'list'].includes(normalizedMessage)) {
      await this.sendMainMenu(senderNumber);
      return true;
    }

    if (normalizedMessage.includes('booking-')) {
      await this.checkBookingStatus(senderNumber, normalizedMessage, prismaService);
      return true;
    }

    if (/^h[1-4]$/i.test(normalizedMessage)) {
      await this.processHelpOption(senderNumber, normalizedMessage.toUpperCase());
      return true;
    }

    if (/^h\d+$/i.test(normalizedMessage)) {
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, kode bantuan tidak valid. Silakan gunakan kode H1-H4 untuk mengakses menu bantuan. Ketik MENU untuk melihat opsi menu.',
      );
      return true;
    }

    if (/^a[1-4]$/i.test(normalizedMessage)) {
      if (activeTransactions.length > 0) {
        await this.processActiveTransactionCode(
          activeTransactions[0],
          normalizedMessage.toUpperCase(),
          senderNumber,
        );
      } else {
        await this.messagingService.sendMessage(
          senderNumber,
          'Maaf, Anda tidak memiliki transaksi aktif. Ketik MENU untuk melihat menu utama.',
        );
      }
      return true;
    }

    if (/^a\d+$/i.test(normalizedMessage)) {
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, kode transaksi tidak valid. Silakan gunakan kode A1-A4 untuk mengakses menu transaksi. Ketik MENU untuk melihat opsi menu.',
      );
      return true;
    }

    if (/^b[12]$/i.test(normalizedMessage)) {
      const allTransactions = await prismaService.transaksiSewa.findMany({
        where: {
          noWhatsapp: formatWhatsappNumber(senderNumber),
        },
        include: {
          unitMotor: { include: { jenis: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (allTransactions.length > 0) {
        await this.processCompletionOption(
          allTransactions[0],
          normalizedMessage.toUpperCase(),
          senderNumber,
        );
      } else {
        await this.messagingService.sendMessage(
          senderNumber,
          'Maaf, Anda tidak memiliki riwayat transaksi. Ketik MENU untuk melihat menu utama.',
        );
      }
      return true;
    }

    if (/^b\d+$/i.test(normalizedMessage)) {
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, kode menu tidak valid. Silakan gunakan kode B1-B2 untuk mengakses menu setelah transaksi. Ketik MENU untuk melihat opsi menu.',
      );
      return true;
    }

    return false;
  }

  private async sendDefaultResponse(senderNumber: string, activeTransactions: any[]) {
    if (activeTransactions.length > 0) {
      await this.sendActiveTransactionInfo(activeTransactions[0], senderNumber);
    } else {
      await this.sendWelcomeMessage(senderNumber);
    }
  }

  private async processHelpOption(senderNumber: string, option: string) {
    const helpMenuMap = {
      ['H1']: whatsappMenu.getRentalRequirementsTemplate(),
      ['H2']: whatsappMenu.getPaymentInfoTemplate(),
      ['H3']: whatsappMenu.getAdminContactTemplate(),
      ['H4']: whatsappMenu.getFAQTemplate(),
    };

    const message = helpMenuMap[option] || whatsappMenu.getHelpMenuTemplate();
    await this.messagingService.sendMessage(senderNumber, message);
  }

  private async processActiveTransactionCode(
    transaction: any,
    option: string,
    senderNumber: string,
  ) {
    const actionMap = {
      ['A1']: () => this.sendPaymentInstructions(transaction, senderNumber),
      ['A2']: () => this.sendActiveTransactionInfo(transaction, senderNumber),
      ['A3']: () => this.sendExtensionInstructions(transaction, senderNumber),
      ['A4']: () => this.sendCustomHelpMenu(senderNumber),
    };

    const action = actionMap[option];
    if (action) {
      await action();
    } else {
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, pilihan menu tidak valid. Silakan pilih menu A1-A4. Ketik MENU untuk melihat opsi menu.',
      );
    }
  }

  private async processCompletionOption(transaction: any, option: string, senderNumber: string) {
    const actionMap = {
      ['B1']: () => this.sendActiveTransactionInfo(transaction, senderNumber),
      ['B2']: () => this.sendCustomHelpMenu(senderNumber),
    };

    const action = actionMap[option];
    if (action) {
      await action();
    } else {
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, pilihan menu tidak valid. Ketik MENU untuk melihat opsi menu.',
      );
    }
  }

  private async sendMainMenu(senderNumber: string) {
    const menuText = whatsappMenu.getMainMenuTemplate();
    await this.messagingService.sendMessage(senderNumber, menuText);
  }

  private async sendActiveTransactionMenu(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getActiveTransactionMenuTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  private async sendActiveTransactionInfo(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getActiveTransactionInfoTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  private async sendPaymentInstructions(transaction: any, senderNumber: string) {
    const message = whatsappMenu.getPaymentInstructionsTemplate(transaction);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  private async sendExtensionInstructions(transaction: any, senderNumber: string) {
    const config = this.connectionService.getConfig();
    const message = whatsappMenu.getExtensionInstructionsTemplate(transaction, config.adminNumber);
    await this.messagingService.sendMessage(senderNumber, message);
  }

  private async processMenuSelection(senderNumber: string, menuOption: number, prisma: any) {
    try {
      this.logger.log(`Mulai memproses pilihan menu ${menuOption} dari ${senderNumber}`);

      const menuActions = {
        [1]: () => this.sendMotorList(senderNumber, prisma),
        [2]: () => this.sendRentalPrices(senderNumber, prisma),
        [3]: () => this.sendBookingInfo(senderNumber),
        [4]: () => this.sendTransactionStatusInfo(senderNumber),
        [5]: () => this.sendCustomHelpMenu(senderNumber),
      };

      const action = menuActions[menuOption];
      if (action) {
        await action();
      } else {
        await this.messagingService.sendMessage(
          senderNumber,
          'Maaf, pilihan menu tidak valid. Silakan pilih menu 1-5.',
        );
      }

      this.logger.log(`Selesai memproses pilihan menu ${menuOption} dari ${senderNumber}`);
    } catch (error) {
      this.logger.error(`Error memproses pilihan menu: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.',
      );
    }
  }

  private async sendMotorList(senderNumber: string, prisma: any) {
    try {
      this.logger.log(`[MOTOR LIST] Mengambil data motor dari database untuk ${senderNumber}`);

      const jenisMotor = await prisma.jenisMotor.findMany({
        include: {
          unitMotor: {
            where: { status: 'TERSEDIA' },
          },
        },
        orderBy: { model: 'asc' },
      });

      this.logger.log(`[MOTOR LIST] Ditemukan ${jenisMotor.length} jenis motor`);

      await new Promise(resolve => setTimeout(resolve, 500));

      const motorListText = whatsappMenu.getMotorListTemplate(jenisMotor);
      const result = await this.messagingService.sendMessage(senderNumber, motorListText);

      if (!result) {
        await this.messagingService.sendMessage(
          senderNumber,
          '🏍️ Silakan kunjungi website kami untuk melihat daftar motor yang tersedia: https://rosantibikemotorent.com/motors',
        );
      }
    } catch (error) {
      this.logger.error(`[MOTOR LIST] Error mendapatkan daftar motor: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat mengambil data motor. Silakan coba lagi nanti atau kunjungi website kami: https://rosantibikemotorent.com/motors',
      );
    }
  }

  private async sendRentalPrices(senderNumber: string, prisma: any) {
    try {
      const jenisMotor = await prisma.jenisMotor.findMany({
        include: {
          unitMotor: {
            where: { status: 'TERSEDIA' },
          },
        },
        orderBy: { model: 'asc' },
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

  private async checkBookingStatus(senderNumber: string, message: string, prisma: any) {
    try {
      const bookingCodeMatch = message.match(/booking-([\da-z]+)/i);
      if (!bookingCodeMatch || !bookingCodeMatch[1]) {
        await this.messagingService.sendMessage(
          senderNumber,
          'Format kode booking tidak valid. Gunakan format: BOOKING-[kode]',
        );
        return;
      }

      const bookingCode = bookingCodeMatch[1];

      const transaction = await prisma.transaksiSewa.findFirst({
        where: {
          id: {
            contains: bookingCode,
            mode: 'insensitive',
          },
        },
        include: {
          unitMotor: {
            include: { jenis: true },
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

      await this.sendActiveTransactionInfo(transaction, senderNumber);
    } catch (error) {
      this.logger.error(`Error memeriksa status booking: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat memeriksa status booking. Silakan coba lagi nanti.',
      );
    }
  }

  private async sendBookingInfo(senderNumber: string) {
    try {
      this.logger.log(`[BOOKING INFO] Mengirim informasi pemesanan ke ${senderNumber}`);

      const config = this.connectionService.getConfig();
      const adminNumber = config.adminNumber || '+6285232152313';

      const bookingText = whatsappMenu.getBookingInfoTemplate(adminNumber);
      const result = await this.sendMessageWithRetry(senderNumber, bookingText);

      if (!result) {
        await this.messagingService.sendMessage(
          senderNumber,
          '📝 *INFO PEMESANAN* 📝\n\nUntuk melakukan pemesanan, silakan hubungi admin kami di nomor berikut:\nAdmin: ' +
            adminNumber,
        );
      }
    } catch (error) {
      this.logger.error(`[BOOKING INFO] Error: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat mengambil informasi pemesanan. Silakan hubungi admin kami.',
      );
    }
  }

  private async sendMessageWithRetry(
    senderNumber: string,
    message: string,
    maxAttempts = 3,
  ): Promise<boolean> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await this.messagingService.sendMessage(senderNumber, message);
        if (result) {
          return true;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        attempts++;
        this.logger.error(`Error saat mengirim (percobaan ${attempts}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return false;
  }

  private async sendTransactionStatusInfo(senderNumber: string) {
    try {
      const formattedNumber = formatWhatsappNumber(senderNumber);

      const prismaModule = await import('../../../common/modules/prisma/services/prisma.service');
      const prismaService = new prismaModule.PrismaService();

      const transactions = await prismaService.transaksiSewa.findMany({
        where: {
          noWhatsapp: formattedNumber,
        },
        include: {
          unitMotor: {
            include: { jenis: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (transactions.length === 0) {
        await this.messagingService.sendMessage(
          senderNumber,
          'Tidak ditemukan transaksi terkait dengan nomor WhatsApp Anda. Silakan hubungi admin untuk informasi lebih lanjut.',
        );
        return;
      }

      const latestTransaction = transactions[0];
      await this.sendActiveTransactionInfo(latestTransaction, senderNumber);

      if (transactions.length > 1) {
        await this.messagingService.sendMessage(
          senderNumber,
          `Anda memiliki ${transactions.length} transaksi. Info di atas adalah transaksi terbaru Anda. Untuk melihat riwayat lengkap, silakan hubungi admin.`,
        );
      }
    } catch (error) {
      this.logger.error(`[STATUS TRANSAKSI] Error: ${error.message}`);
      await this.messagingService.sendMessage(
        senderNumber,
        'Maaf, terjadi kesalahan saat memeriksa status transaksi. Silakan coba lagi nanti.',
      );
    }
  }

  private async sendCustomHelpMenu(senderNumber: string) {
    const helpText = whatsappMenu.getHelpMenuTemplate();
    await this.messagingService.sendMessage(senderNumber, helpText);
  }

  private async sendWelcomeMessage(senderNumber: string) {
    const welcomeText = whatsappMenu.getWelcomeMessageTemplate();
    await this.messagingService.sendMessage(senderNumber, welcomeText);
  }
}
