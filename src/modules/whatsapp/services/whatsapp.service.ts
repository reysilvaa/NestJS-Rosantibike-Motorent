import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { logInfo } from '../../../common/helpers';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly session: string;
  private readonly secretKey: string;
  private token: string | null = null;
  
  private isConnecting = false;
  private retryCount = 0;
  public maxRetries: number;
  private retryDelay: number;
  private reconnectAttemptInProgress = false;
  private connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error'
    | 'reconnecting'
    | 'authenticated' = 'disconnected';
  
  private lastQrCode: string | null = null;
  private readonly adminNumber: string;
  private sendDebugMessages = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = configService.get('WHATSAPP_API_URL') || 'https://wppconnect.rosantibikemotorent.com';
    this.session = configService.get('WHATSAPP_SESSION') || 'rosantibikemotorent';
    this.secretKey = configService.get('WHATSAPP_SECRET_KEY') || 'back231213';

    this.adminNumber = configService.get('ADMIN_WHATSAPP') || '';
    this.sendDebugMessages = configService.get('WHATSAPP_SEND_DEBUG') === 'true';

    this.retryDelay = parseInt(configService.get('WHATSAPP_RECONNECT_INTERVAL') || '60000', 10);
    this.maxRetries = parseInt(configService.get('WHATSAPP_MAX_RECONNECT_ATTEMPTS') || '10', 10);

    this.logger.log(`WhatsApp API URL: ${this.baseUrl}`);
    this.logger.log(`WhatsApp session: ${this.session}`);
    this.logger.log(`WhatsApp debug messages: ${this.sendDebugMessages ? 'enabled' : 'disabled'}`);
    this.logger.log(
      `WhatsApp reconnect interval: ${this.retryDelay}ms, max retries: ${this.maxRetries}`,
    );
  }

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Shutting down WhatsApp client');
      await this.closeSession();
    } catch (error) {
      this.logger.error(`Error closing WhatsApp session: ${error.message}`);
    }
  }

  async resetConnection() {
    this.logger.log('Resetting WhatsApp connection...');
    this.retryCount = 0;
    this.lastQrCode = null;
    this.isConnecting = false;
    this.reconnectAttemptInProgress = false;

      try {
      this.logger.log('Closing previous WhatsApp session');
      await this.closeSession();
      } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    this.logger.log('Starting new WhatsApp connection...');
    return this.connect();
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isConnecting: this.isConnecting,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      reconnectAttemptInProgress: this.reconnectAttemptInProgress,
      hasQrCode: !!this.lastQrCode,
    };
  }

  getLastQrCode() {
    return this.lastQrCode;
  }

  /**
   * Generate token untuk API WhatsApp
   */
  private async generateToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/${this.secretKey}/generate-token`,
        {},
        {
          headers: {
            accept: '*/*',
            contentType: 'application/json',
          },
        }
      );

      if (response.data && response.data.status === 'success' && response.data.token) {
        this.token = response.data.token;
        this.logger.log('Successfully generated WhatsApp API token');
        return response.data.token;
      } else {
        throw new Error('Failed to generate token: Invalid response format');
      }
    } catch (error) {
      this.logger.error(`Error generating token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Memeriksa status koneksi sesi WhatsApp
   */
  private async checkConnection() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.session}/check-connection-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (response.data) {
        if (response.data.status) {
          this.connectionStatus = 'connected';
          return true;
        } else {
          this.connectionStatus = 'disconnected';
          return false;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking connection: ${error.message}`);
      this.connectionStatus = 'error';
      return false;
    }
  }

  /**
   * Mendapatkan status sesi WhatsApp
   */
  async getSessionStatus() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.session}/status-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting session status: ${error.message}`);
      return { status: 'ERROR', qrcode: null };
    }
  }

  /**
   * Memulai sesi WhatsApp
   */
  private async startSession() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      // Get webhook URL from config
      const webhookUrl = this.configService.get('WEBHOOK_URL') || `${this.configService.get('APP_URL')}/api/whatsapp/webhook`;
      this.logger.log(`Setting webhook URL to: ${webhookUrl}`);

      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/start-session`,
        {
          webhook: webhookUrl,
          waitQrCode: false
        },
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (response.data) {
        if (response.data.status === 'QRCODE' && response.data.qrcode) {
          // QR code diterima, simpan untuk ditampilkan jika diperlukan
          this.lastQrCode = response.data.qrcode;
          this.connectionStatus = 'connecting';
          this.logger.log('QR code received from WhatsApp API');
          return { status: 'qrcode', qrCode: response.data.qrcode };
        } else if (response.data.status === 'CONNECTED') {
          this.connectionStatus = 'connected';
          this.lastQrCode = null;
          this.logger.log('Session started successfully');
          return { status: 'connected' };
        }
      }

      throw new Error('Failed to start session: Invalid response format');
    } catch (error) {
      this.logger.error(`Error starting session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Memulai semua sesi WhatsApp
   */
  async startAllSessions() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.post(
        `${this.baseUrl}/api/${this.secretKey}/start-all?session=${this.session}`,
        {},
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      this.logger.log('Starting all WhatsApp sessions');
      return response.data;
    } catch (error) {
      this.logger.error(`Error starting all sessions: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Mendapatkan daftar semua sesi WhatsApp
   */
  async getAllSessions() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.secretKey}/show-all-sessions`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting all sessions: ${error.message}`);
      return { response: [] };
    }
  }

  /**
   * Menutup sesi WhatsApp
   */
  private async closeSession() {
    try {
      if (!this.token) {
        return { status: 'error', message: 'No token available' };
      }

      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/close-session`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      this.connectionStatus = 'disconnected';
      return response.data;
    } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Logout dari sesi WhatsApp
   */
  async logoutSession() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/logout-session`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      this.connectionStatus = 'disconnected';
      return response.data;
    } catch (error) {
      this.logger.error(`Error logging out session: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Mendapatkan QR code
   */
  private async getQrCode() {
    try {
      if (!this.token) {
        await this.generateToken();
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.session}/qrcode-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (response.data && response.data.status === 'QRCODE' && response.data.qrcode) {
        this.lastQrCode = response.data.qrcode;
        this.logger.log('QR code fetched successfully');
        return response.data.qrcode;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting QR code: ${error.message}`);
      return null;
    }
  }

  /**
   * Konek ke WhatsApp
   */
  private async connect() {
    if (this.isConnecting) {
      this.logger.log('Connection attempt already in progress');
      return;
    }

    if (this.reconnectAttemptInProgress) {
      this.logger.log('Reconnect already scheduled, ignoring additional connect request');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';

    try {
      this.logger.log(`Connecting to WhatsApp (Attempt ${this.retryCount + 1}/${this.maxRetries})`);

      // Pertama, cek apakah sudah terhubung
      const isConnected = await this.checkConnection();
      
      if (isConnected) {
        this.logger.log('Already connected to WhatsApp');
        this.connectionStatus = 'connected';
        this.isConnecting = false;
            this.retryCount = 0;

            if (this.sendDebugMessages) {
              setTimeout(() => {
                this.sendToAdmin('WhatsApp berhasil terhubung').catch(error =>
                  this.logger.error(`Failed to send connection notification: ${error.message}`),
                );
              }, 5000);
            }

        return;
      }

      // Jika belum terhubung, mulai sesi dan dapatkan QR code jika diperlukan
      const sessionResult = await this.startSession();
      
      if (sessionResult.status === 'connected') {
        this.logger.log('WhatsApp connection established successfully');
        this.connectionStatus = 'connected';
            this.isConnecting = false;
        this.retryCount = 0;
        
        if (this.sendDebugMessages) {
          setTimeout(() => {
            this.sendToAdmin('WhatsApp berhasil terhubung').catch(error =>
              this.logger.error(`Failed to send connection notification: ${error.message}`),
            );
              }, 5000);
        }
      } else if (sessionResult.status === 'qrcode') {
        this.logger.log('QR code received, waiting for scan...');
        // Set interval untuk terus memeriksa status koneksi setelah QR code diterima
        const checkInterval = setInterval(async () => {
          const checkResult = await this.checkConnection();
          
          if (checkResult) {
            clearInterval(checkInterval);
            this.logger.log('QR code scanned successfully, now connected');
            this.connectionStatus = 'connected';
            this.isConnecting = false;
              this.retryCount = 0;
            this.lastQrCode = null;
            
            if (this.sendDebugMessages) {
              this.sendToAdmin('WhatsApp berhasil terhubung').catch(error =>
                this.logger.error(`Failed to send connection notification: ${error.message}`),
              );
            }
          }
        }, 10_000); // Cek setiap 10 detik
        
        // Hentikan interval setelah 2 menit jika masih belum terhubung
        setTimeout(() => {
          clearInterval(checkInterval);
          if (this.connectionStatus !== 'connected') {
            this.isConnecting = false;
            this.handleDisconnect('QR code scan timeout');
          }
        }, 120_000);
      }

    } catch (error) {
      this.isConnecting = false;
      this.logger.error(`Error connecting to WhatsApp: ${error.message}`);
      await this.handleDisconnect(error.message);
    }
  }

  private async handleDisconnect(reason: string) {
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
    this.logger.log(`WhatsApp disconnected: ${reason}`);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
      this.connectionStatus = 'reconnecting';
        this.logger.log(
          `Akan mencoba menghubungkan kembali dalam ${this.retryDelay / 1000} detik... (Percobaan ${this.retryCount}/${this.maxRetries})`,
        );

        this.reconnectAttemptInProgress = true;

        setTimeout(async () => {
          this.reconnectAttemptInProgress = false;
          await this.connect();
        }, this.retryDelay);
      } else {
        this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
        this.connectionStatus = 'error';
    }
  }

  /**
   * Mengirim pesan WhatsApp
   */
  async sendMessage(to: string, message: string) {
    if (this.connectionStatus !== 'connected') {
      this.logger.error('WhatsApp is not connected');
      throw new Error('WhatsApp is not connected');
    }

    if (!this.token) {
      await this.generateToken();
    }

    try {
      let formattedNumber = to;

      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.slice(1);
      }

      // Pastikan nomor tidak memiliki format @c.us atau @s.whatsapp.net
      if (formattedNumber.includes('@')) {
        formattedNumber = formattedNumber.split('@')[0];
      }

      this.logger.log(`Sending message to ${to} (formatted: ${formattedNumber})`);
      
      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/send-message`,
        {
          phone: formattedNumber,
          message: message,
        },
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
          timeout: 30_000,
        }
      );

      if (response.data && response.data.status === 'success') {
        this.logger.log(`Message sent successfully to ${to}`);
        return response.data;
      } else {
        throw new Error(`Failed to send message: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message to ${to}: ${error.message}`);

      if (
        error.message.includes('Connection Closed') ||
        error.message.includes('lost connection') ||
        error.message.includes('Timed Out') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        this.logger.log('Connection issue detected, attempting to reconnect...');

        if (error.response?.status === 401 || error.response?.status === 403) {
          // Token mungkin kadaluarsa, coba generate ulang
          this.token = null;
          await this.generateToken();
        }

        if (error.message.includes('Timed Out') || error.message.includes('timeout')) {
          await this.resetConnection();
        } else {
          await this.connect();
        }
      }

      return null;
    }
  }

  /**
   * Mendapatkan daftar chat
   */
  async getChats() {
    if (!this.token) {
      await this.generateToken();
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/list-chats`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting chats: ${error.message}`);
      return null;
    }
  }

  /**
   * Mendapatkan pesan dalam chat
   */
  async getMessagesInChat(phone: string) {
    if (!this.token) {
      await this.generateToken();
    }

    try {
      let formattedNumber = phone;

      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.slice(1);
      }

      // Pastikan nomor tidak memiliki format @c.us atau @s.whatsapp.net
      if (formattedNumber.includes('@')) {
        formattedNumber = formattedNumber.split('@')[0];
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.session}/all-messages-in-chat/${formattedNumber}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting messages from chat ${phone}: ${error.message}`);
      return null;
    }
  }

  /**
   * Mendapatkan informasi kontak
   */
  async getContact(phone: string) {
    if (!this.token) {
      await this.generateToken();
    }

    try {
      let formattedNumber = phone;

      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.slice(1);
      }

      // Pastikan nomor tidak memiliki format @c.us atau @s.whatsapp.net
      if (formattedNumber.includes('@')) {
        formattedNumber = formattedNumber.split('@')[0];
      }

      const response = await axios.get(
        `${this.baseUrl}/api/${this.session}/contact/${formattedNumber}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting contact ${phone}: ${error.message}`);
      return null;
    }
  }

  /**
   * Mengirim pesan ke admin
   */
  async sendToAdmin(message: string) {
    try {
    if (!this.adminNumber) {
        this.logger.warn('Admin WhatsApp number is not configured');
        return false;
      }

      // Format admin number
      const adminWhatsapp = this.adminNumber.startsWith('+')
        ? this.adminNumber.slice(1)
        : this.adminNumber;
      const whatsappId = `${adminWhatsapp}@s.whatsapp.net`;

      // Send message to admin
      return await this.sendMessage(whatsappId, message);
    } catch (error) {
      this.logger.error(`Error sending message to admin: ${error.message}`);
      return false;
    }
  }

  /**
   * Inisialisasi koneksi WhatsApp
   * Method ini digunakan oleh processor untuk menginisialisasi ulang koneksi WhatsApp
   */
  async initialize() {
    try {
      this.logger.log('Initializing WhatsApp');
      return await this.connect();
    } catch (error) {
      this.logger.error(`Error initializing WhatsApp: ${error.message}`);
      return false;
    }
  }

  /**
   * Memproses pesan masuk dari pengguna WhatsApp
   */
  async processIncomingMessage(from: string, message: string, messageData: any) {
    try {
      this.logger.log(`Processing incoming message from ${from}: ${message}`);
      
      // Format nomor pengirim (hapus @s.whatsapp.net atau @g.us)
      const senderNumber = from.split('@')[0];
      
      // Cari transaksi terkait dengan nomor pengirim
      const PrismaService = (await import('../../../common/prisma/prisma.service')).PrismaService;
      const prisma = new PrismaService();
      
      // Cari transaksi aktif untuk nomor ini
      const activeTransactions = await prisma.transaksiSewa.findMany({
        where: {
          noWhatsapp: {
            contains: senderNumber,
          },
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

      // Jika ada transaksi aktif
      if (activeTransactions.length > 0) {
        const transaction = activeTransactions[0];
        
        // Periksa konten pesan untuk menentukan aksi
        await this.processUserMenuRequest(transaction, message, senderNumber);
      } else {
        // Tidak ada transaksi aktif, kirim pesan informasi umum
        await this.sendDefaultMessage(senderNumber);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error processing incoming message: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Memproses permintaan menu dari pengguna
   */
  private async processUserMenuRequest(transaction: any, message: string, senderNumber: string) {
    try {
      const normalizedMessage = message.trim().toLowerCase();
      
      // Jika menu diidentifikasi dengan angka
      if (normalizedMessage === '1' || normalizedMessage.includes('lunasi dp') || normalizedMessage.includes('bayar dp')) {
        await this.sendPaymentInstructions(transaction, senderNumber);
      } else if (normalizedMessage === '2' || normalizedMessage.includes('cek info') || normalizedMessage.includes('info saya')) {
        await this.sendTransactionInfo(transaction, senderNumber);
      } else if (normalizedMessage === '3' || normalizedMessage.includes('perpanjang')) {
        await this.sendExtensionInstructions(transaction, senderNumber);
      } else if (normalizedMessage === '4' || normalizedMessage.includes('bantuan') || normalizedMessage.includes('help')) {
        await this.sendHelpMenu(senderNumber);
      } else {
        // Jika pesan tidak cocok dengan menu yang tersedia
        await this.sendMenuOptions(transaction, senderNumber);
      }
    } catch (error) {
      this.logger.error(`Error processing user menu request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim informasi pembayaran DP
   */
  private async sendPaymentInstructions(transaction: any, senderNumber: string) {
    try {
      const message = `*INSTRUKSI PEMBAYARAN DP*\n\n`
        + `Untuk melunasi DP motor ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} ${transaction.unitMotor.platNomor}, silahkan transfer ke:\n\n`
        + `Bank: BCA\n`
        + `No. Rekening: 1234567890\n`
        + `Atas Nama: Rosanti Bike Motorent\n`
        + `Jumlah: Rp ${this.formatCurrency(transaction.totalBiaya * 0.3)}\n\n`
        + `Setelah transfer, mohon kirimkan bukti pembayaran ke nomor ini.\n\n`
        + `Kode Booking: ${transaction.id}\n\n`
        + `*MENU LAYANAN WHATSAPP*:\n`
        + `1. *Lunasi DP* - Instruksi pembayaran DP\n`
        + `2. *Cek Info Saya* - Detail booking Anda\n`
        + `3. *Perpanjang Sewa* - Perpanjang masa sewa\n`
        + `4. *Bantuan* - Menu bantuan tambahan\n\n`
        + `Terima kasih.`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending payment instructions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim informasi transaksi
   */
  private async sendTransactionInfo(transaction: any, senderNumber: string) {
    try {
      const startDate = new Date(transaction.tanggalMulai).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const endDate = new Date(transaction.tanggalSelesai).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const message = `*INFORMASI BOOKING ANDA*\n\n`
        + `Nama: ${transaction.namaPenyewa}\n`
        + `Motor: ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor})\n`
        + `Tanggal Mulai: ${startDate} ${transaction.jamMulai}\n`
        + `Tanggal Selesai: ${endDate} ${transaction.jamSelesai}\n`
        + `Total Biaya: Rp ${this.formatCurrency(transaction.totalBiaya)}\n`
        + `Status: ${this.getStatusLabel(transaction.status)}\n\n`
        + `Kode Booking: ${transaction.id}\n\n`
        + `*MENU LAYANAN WHATSAPP*:\n`
        + `1. *Lunasi DP* - Instruksi pembayaran DP\n`
        + `2. *Cek Info Saya* - Detail booking Anda\n`
        + `3. *Perpanjang Sewa* - Perpanjang masa sewa\n`
        + `4. *Bantuan* - Menu bantuan tambahan`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending transaction info: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim instruksi perpanjangan
   */
  private async sendExtensionInstructions(transaction: any, senderNumber: string) {
    try {
      const message = `*PERPANJANGAN SEWA*\n\n`
        + `Untuk perpanjang sewa motor ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} ${transaction.unitMotor.platNomor}, silahkan kunjungi link berikut:\n\n`
        + `https://rosantibikemotorent.com/perpanjang/${transaction.id}\n\n`
        + `Atau hubungi admin di nomor berikut untuk bantuan:\n`
        + `Admin: ${this.adminNumber}\n\n`
        + `*MENU LAYANAN WHATSAPP*:\n`
        + `1. *Lunasi DP* - Instruksi pembayaran DP\n`
        + `2. *Cek Info Saya* - Detail booking Anda\n`
        + `3. *Perpanjang Sewa* - Perpanjang masa sewa\n`
        + `4. *Bantuan* - Menu bantuan tambahan\n\n`
        + `Terima kasih.`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending extension instructions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim menu bantuan
   */
  private async sendHelpMenu(senderNumber: string) {
    try {
      const message = `*MENU BANTUAN*\n\n`
        + `1. *Lunasi DP* - Instruksi pembayaran DP\n`
        + `2. *Cek Info* - Lihat informasi booking Anda\n`
        + `3. *Perpanjang* - Perpanjang masa sewa\n`
        + `4. *Bantuan* - Tampilkan menu bantuan\n\n`
        + `Ketik sesuai nomor menu atau ketik nama menu untuk melanjutkan.\n\n`
        + `Jika Anda membutuhkan bantuan lebih lanjut, silahkan hubungi admin kami di:\n`
        + `Admin: ${this.adminNumber}`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending help menu: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim menu opsi
   */
  private async sendMenuOptions(transaction: any, senderNumber: string) {
    try {
      const message = `*MENU ROSANTI BIKE MOTORENT*\n\n`
        + `Halo ${transaction.namaPenyewa},\n`
        + `Silahkan pilih menu yang tersedia:\n\n`
        + `1. *Lunasi DP*\n`
        + `2. *Cek Info Saya*\n`
        + `3. *Perpanjang Sewa*\n`
        + `4. *Bantuan*\n\n`
        + `Ketik sesuai nomor menu atau ketik nama menu untuk melanjutkan.`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending menu options: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Kirim pesan default untuk nomor yang tidak memiliki transaksi aktif
   */
  private async sendDefaultMessage(senderNumber: string) {
    try {
      const message = `*ROSANTI BIKE MOTORENT*\n\n`
        + `Halo! Terima kasih telah menghubungi Rosanti Bike Motorent.\n\n`
        + `Sepertinya Anda tidak memiliki transaksi aktif saat ini.\n`
        + `Untuk menyewa motor, silahkan kunjungi website kami di:\n`
        + `https://rosantibikemotorent.com\n\n`
        + `Atau hubungi admin kami di:\n`
        + `Admin: ${this.adminNumber}\n\n`
        + `Terima kasih.`;
      
      await this.sendMessage(`${senderNumber}@s.whatsapp.net`, message);
    } catch (error) {
      this.logger.error(`Error sending default message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }

  /**
   * Get status label
   */
  private getStatusLabel(status: string): string {
    const statusMap = {
      'AKTIF': 'Aktif',
      'SELESAI': 'Selesai',
      'DIBATALKAN': 'Dibatalkan',
      'OVERDUE': 'Terlambat',
    };
    
    return statusMap[status] || status;
  }
}