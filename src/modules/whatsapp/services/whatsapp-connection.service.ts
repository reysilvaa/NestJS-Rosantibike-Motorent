import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type {
  WhatsappConfig,
  WhatsappConnectionStatus,
  WhatsappStatus,
} from '../../../common/interfaces/whatsapp.interface';

@Injectable()
export class WhatsappConnectionService {
  private readonly logger = new Logger(WhatsappConnectionService.name);
  private readonly config: WhatsappConfig;
  private token: string | null = null;

  private isConnecting = false;
  private retryCount = 0;
  private reconnectAttemptInProgress = false;
  private connectionStatus: WhatsappConnectionStatus = 'disconnected';
  private lastQrCode: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      baseUrl:
        configService.get('WHATSAPP_API_URL') || 'https://wppconnect.rosantibikemotorent.com',
      session: configService.get('WHATSAPP_SESSION') || 'rosantibikemotorent',
      secretKey: configService.get('WHATSAPP_SECRET_KEY') || 'back231213',
      adminNumber: configService.get('ADMIN_WHATSAPP') || '',
      sendDebugMessages: configService.get('WHATSAPP_SEND_DEBUG') === 'true',
      retryDelay: parseInt(configService.get('WHATSAPP_RECONNECT_INTERVAL') || '60000', 10),
      maxRetries: parseInt(configService.get('WHATSAPP_MAX_RECONNECT_ATTEMPTS') || '10', 10),
    };

    this.logger.log(`WhatsApp API URL: ${this.config.baseUrl}`);
    this.logger.log(`WhatsApp session: ${this.config.session}`);
    this.logger.log(
      `WhatsApp debug messages: ${this.config.sendDebugMessages ? 'enabled' : 'disabled'}`,
    );
    this.logger.log(
      `WhatsApp reconnect interval: ${this.config.retryDelay}ms, max retries: ${this.config.maxRetries}`,
    );
  }

  getConfig(): WhatsappConfig {
    return this.config;
  }

  async generateToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/${this.config.session}/${this.config.secretKey}/generate-token`,
        {},
        {
          headers: {
            accept: '*/*',
            contentType: 'application/json',
          },
        },
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

  async getToken(): Promise<string> {
    if (!this.token) {
      return this.generateToken();
    }
    return this.token;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const token = await this.getToken();

      const response = await axios.get(
        `${this.config.baseUrl}/api/${this.config.session}/check-connection-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${token}`,
          },
        },
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

  async getSessionStatus() {
    try {
      const token = await this.getToken();

      const response = await axios.get(
        `${this.config.baseUrl}/api/${this.config.session}/status-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting session status: ${error.message}`);
      return { status: 'ERROR', qrcode: null };
    }
  }

  async startSession() {
    try {
      const token = await this.getToken();

      const webhookUrl = this.configService.get('WEBHOOK_URL');
      this.logger.log(`Setting webhook URL to: ${webhookUrl}`);
      if (!webhookUrl.startsWith('http')) {
        this.logger.warn(
          `Webhook URL tidak valid: ${webhookUrl}. URL harus dimulai dengan http:// or https://`,
        );
      }

      try {
        const response = await axios.post(
          `${this.config.baseUrl}/api/${this.config.session}/start-session`,
          {
            webhook: webhookUrl,
            waitQrCode: false,
            webhookEnabled: true,
          },
          {
            headers: {
              accept: 'application/json',
              contentType: 'application/json',
              authorization: `Bearer ${token}`,
            },
            timeout: 15000,
          },
        );

        if (response.data) {
          if (response.data.status === 'QRCODE' && response.data.qrcode) {
            this.lastQrCode = response.data.qrcode;
            this.connectionStatus = 'connecting';
            this.logger.log('QR code received from WhatsApp API');
            return { status: 'qrcode', qrCode: response.data.qrcode };
          } else if (response.data.status === 'CONNECTED') {
            this.connectionStatus = 'connected';
            this.lastQrCode = null;
            this.logger.log('Session started successfully');
            return { status: 'connected' };
          } else if (response.data.qrcode) {
            // Format alternatif untuk QR code
            this.lastQrCode = response.data.qrcode;
            this.connectionStatus = 'connecting';
            this.logger.log('QR code received from WhatsApp API (alternative format)');
            return { status: 'qrcode', qrCode: response.data.qrcode };
          }
        }

        this.logger.warn('Format respons tidak dikenali, mencoba metode alternatif');
      } catch (startError) {
        this.logger.warn(
          `Error pada start-session: ${startError.message}, mencoba metode alternatif`,
        );
      }

      // Metode alternatif jika start-session gagal
      try {
        const altResponse = await axios.post(
          `${this.config.baseUrl}/api/${this.config.session}/start-all`,
          {},
          {
            headers: {
              accept: 'application/json',
              contentType: 'application/json',
              authorization: `Bearer ${token}`,
            },
            timeout: 15000, // Timeout 15 detik
          },
        );

        if (altResponse.data) {
          this.logger.log(`Respons dari start-all: ${JSON.stringify(altResponse.data)}`);

          // Cek jika berhasil
          if (altResponse.data.status === 'success' || altResponse.data.status === 'CONNECTED') {
            this.connectionStatus = 'connected';
            this.lastQrCode = null;
            this.logger.log('Session started successfully via alternative method');
            return { status: 'connected' };
          }

          // Cek jika perlu QR code
          if (altResponse.data.qrcode || (altResponse.data.data && altResponse.data.data.qrcode)) {
            const qrCode = altResponse.data.qrcode || altResponse.data.data.qrcode;
            this.lastQrCode = qrCode;
            this.connectionStatus = 'connecting';
            this.logger.log('QR code received from alternative method');
            return { status: 'qrcode', qrCode };
          }
        }
      } catch (altError) {
        this.logger.warn(`Error pada metode alternatif: ${altError.message}`);
      }

      // Jika semua metode gagal, coba ambil QR code langsung
      try {
        const qrResponse = await axios.get(
          `${this.config.baseUrl}/api/${this.config.session}/qrcode-session`,
          {
            headers: {
              accept: '*/*',
              authorization: `Bearer ${token}`,
            },
            timeout: 15000, // Timeout 15 detik
          },
        );

        if (qrResponse.data && qrResponse.data.qrcode) {
          this.lastQrCode = qrResponse.data.qrcode;
          this.connectionStatus = 'connecting';
          this.logger.log('QR code received directly');
          return { status: 'qrcode', qrCode: qrResponse.data.qrcode };
        }
      } catch (qrError) {
        this.logger.warn(`Error mengambil QR code langsung: ${qrError.message}`);
      }

      throw new Error('Gagal memulai sesi: Semua metode koneksi gagal');
    } catch (error) {
      this.logger.error(`Error starting session: ${error.message}`);
      throw error;
    }
  }

  async startAllSessions() {
    try {
      const token = await this.getToken();

      const response = await axios.post(
        `${this.config.baseUrl}/api/${this.config.secretKey}/start-all?session=${this.config.session}`,
        {},
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${token}`,
          },
        },
      );

      this.logger.log('Starting all WhatsApp sessions');
      return response.data;
    } catch (error) {
      this.logger.error(`Error starting all sessions: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  async getAllSessions() {
    try {
      const token = await this.getToken();

      const response = await axios.get(
        `${this.config.baseUrl}/api/${this.config.secretKey}/show-all-sessions`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting all sessions: ${error.message}`);
      return { response: [] };
    }
  }

  async closeSession() {
    try {
      if (!this.token) {
        return { status: 'error', message: 'No token available' };
      }

      const response = await axios.post(
        `${this.config.baseUrl}/api/${this.config.session}/close-session`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${this.token}`,
          },
        },
      );

      this.connectionStatus = 'disconnected';
      return response.data;
    } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  async logoutSession() {
    try {
      const token = await this.getToken();

      const response = await axios.post(
        `${this.config.baseUrl}/api/${this.config.session}/logout-session`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${token}`,
          },
        },
      );

      this.connectionStatus = 'disconnected';
      return response.data;
    } catch (error) {
      this.logger.error(`Error logging out session: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  async getQrCode() {
    try {
      if (this.connectionStatus === 'connected') {
        this.logger.log('WhatsApp sudah terhubung, tidak perlu QR code');
        return null;
      }
      if (this.lastQrCode && this.connectionStatus === 'connecting') {
        this.logger.log('Menggunakan QR code dari cache');
        return this.lastQrCode;
      }

      const token = await this.getToken();

      this.logger.log('Mengambil QR code baru dari server');
      const response = await axios.get(
        `${this.config.baseUrl}/api/${this.config.session}/qrcode-session`,
        {
          headers: {
            accept: '*/*',
            authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data && response.data.status === 'QRCODE' && response.data.qrcode) {
        this.lastQrCode = response.data.qrcode;
        this.logger.log('QR code baru berhasil diambil');

        if (this.connectionStatus !== 'connecting') {
          this.logger.log('Memulai proses koneksi setelah mendapatkan QR code');
          this.connect().catch(error => {
            this.logger.error(
              `Error memulai koneksi setelah mendapatkan QR code: ${error.message}`,
            );
          });
        }

        return this.lastQrCode;
      } else if (response.data && response.data.status === 'CONNECTED') {
        this.logger.log('Server melaporkan WhatsApp sudah terhubung');
        this.connectionStatus = 'connected';
        this.lastQrCode = null;
        return null;
      }

      if (this.connectionStatus !== 'connecting') {
        this.logger.log('Tidak bisa mendapatkan QR code, mencoba memulai koneksi baru');
        this.connect().catch(error => {
          this.logger.error(`Error saat mencoba koneksi untuk QR code: ${error.message}`);
        });
      }

      return this.lastQrCode;
    } catch (error) {
      this.logger.error(`Error saat mengambil QR code: ${error.message}`);

      if (this.connectionStatus !== 'connecting') {
        this.logger.log('Error saat mengambil QR code, mencoba memulai koneksi baru');
        this.connect().catch(error => {
          this.logger.error(
            `Error saat mencoba koneksi setelah gagal mendapatkan QR code: ${error.message}`,
          );
        });
      }

      return this.lastQrCode;
    }
  }

  async connect() {
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
      this.logger.log(
        `Connecting to WhatsApp (Attempt ${this.retryCount + 1}/${this.config.maxRetries})`,
      );

      // Pertama, cek apakah sudah terhubung
      const isConnected = await this.checkConnection();

      if (isConnected) {
        this.logger.log('Already connected to WhatsApp');
        this.connectionStatus = 'connected';
        this.isConnecting = false;
        this.retryCount = 0;
        return;
      }

      const sessionResult = await this.startSession();

      if (sessionResult.status === 'connected') {
        this.logger.log('WhatsApp connection established successfully');
        this.connectionStatus = 'connected';
        this.isConnecting = false;
        this.retryCount = 0;
      } else if (sessionResult.status === 'qrcode') {
        this.logger.log('QR code received, waiting for scan...');
        const checkInterval = setInterval(async () => {
          const checkResult = await this.checkConnection();

          if (checkResult) {
            clearInterval(checkInterval);
            this.logger.log('QR code scanned successfully, now connected');
            this.connectionStatus = 'connected';
            this.isConnecting = false;
            this.retryCount = 0;
            this.lastQrCode = null;
          }
        }, 10000);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (this.connectionStatus !== 'connected') {
            this.isConnecting = false;
            this.handleDisconnect('QR code scan timeout');
          }
        }, 120000);
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

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.connectionStatus = 'reconnecting';
      this.logger.log(
        `Akan mencoba menghubungkan kembali dalam ${this.config.retryDelay / 1000} detik... (Percobaan ${this.retryCount}/${this.config.maxRetries})`,
      );

      this.reconnectAttemptInProgress = true;

      setTimeout(async () => {
        this.reconnectAttemptInProgress = false;
        await this.connect();
      }, this.config.retryDelay);
    } else {
      this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
      this.connectionStatus = 'error';
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

  getConnectionStatus(): WhatsappStatus {
    return {
      status: this.connectionStatus,
      isConnecting: this.isConnecting,
      retryCount: this.retryCount,
      maxRetries: this.config.maxRetries,
      reconnectAttemptInProgress: this.reconnectAttemptInProgress,
      hasQrCode: !!this.lastQrCode,
    };
  }

  async initialize() {
    try {
      this.logger.log('Initializing WhatsApp');
      return await this.connect();
    } catch (error) {
      this.logger.error(`Error initializing WhatsApp: ${error.message}`);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }
}
