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

      const response = await axios.post(
        `${this.baseUrl}/api/${this.session}/start-session`,
        {
          webhook: '',
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
    if (!this.sendDebugMessages) {
      this.logger.log('Debug messages disabled, not sending to admin');
      return null;
    }

    if (!this.adminNumber) {
      this.logger.error('Admin WhatsApp number not configured');
      return null;
    }

    let adminNumber = this.adminNumber;

    if (adminNumber.startsWith('+')) {
      adminNumber = adminNumber.slice(1);
    }

    if (adminNumber.includes('@')) {
      adminNumber = adminNumber.split('@')[0];
    }

    this.logger.log(`Sending to admin: ${this.adminNumber} (formatted: ${adminNumber})`);
    return this.sendMessage(adminNumber, message);
  }

  /**
   * Inisialisasi koneksi WhatsApp
   * Method ini digunakan oleh processor untuk menginisialisasi ulang koneksi WhatsApp
   */
  async initialize() {
    this.logger.log('Initializing WhatsApp connection from queue processor');
    return this.connect();
  }
}
