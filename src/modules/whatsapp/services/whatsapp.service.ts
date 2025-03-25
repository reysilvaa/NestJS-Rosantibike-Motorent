import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  ConnectionState,
} from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as qrcodeTerminal from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private client: ReturnType<typeof makeWASocket>;
  private readonly sessionPath: string;
  private readonly adminNumber: string;
  private readonly logger = new Logger(WhatsappService.name);
  private isConnecting = false;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 5000; // 5 detik
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';

  constructor(private readonly configService: ConfigService) {
    this.sessionPath = this.configService.get('BAILEYS_SESSION_PATH') || './whatsapp-sessions';
    this.adminNumber = this.configService.get('ADMIN_WHATSAPP') || '';

    // Buat direktori session jika belum ada
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Shutting down WhatsApp client');
      this.client.end(new Error('Service destroyed'));
      this.connectionStatus = 'disconnected';
    }
  }

  async resetConnection() {
    this.logger.log('Resetting WhatsApp connection...');

    // End existing connection if there is one
    if (this.client) {
      this.client.end(new Error('Resetting connection'));
    }

    // Reset connection status
    this.connectionStatus = 'disconnected';
    this.isConnecting = false;
    this.retryCount = 0;

    // Cleanup session files
    await this.cleanupSessionFiles();

    // Restart connection
    this.logger.log('Starting new WhatsApp connection...');
    await this.connect();

    return true;
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      retryCount: this.retryCount,
      isConnecting: this.isConnecting,
    };
  }

  private async connect() {
    if (this.isConnecting) {
      this.logger.log('Connection attempt already in progress');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';

    try {
      this.logger.log(`Connecting to WhatsApp (Attempt ${this.retryCount + 1}/${this.maxRetries})`);

      // Hapus file sesi yang rusak jika retry > 1
      if (this.retryCount > 0) {
        this.logger.log('Cleaning up session files before reconnecting');
        await this.cleanupSessionFiles();
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      this.client = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        qrTimeout: 60000,
        connectTimeoutMs: 120000,
        retryRequestDelayMs: 1000,
        defaultQueryTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
        browser: ['Rental App', 'Chrome', '10.0.0'],
        syncFullHistory: false,
      });

      this.client.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.logger.log('QR Code received, scan to connect');
          qrcodeTerminal.generate(qr, { small: true });
        }

        if (connection === 'open') {
          this.logger.log('WhatsApp connection established successfully');
          this.retryCount = 0; // Reset retry count on successful connection
          this.isConnecting = false;
          this.connectionStatus = 'connected';
        }

        if (connection === 'close') {
          this.isConnecting = false;
          this.connectionStatus = 'disconnected';
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          const errorMessage = (lastDisconnect?.error as Boom)?.output?.payload?.message || '';

          this.logger.error(
            `WhatsApp connection closed. Status code: ${statusCode}, Message: ${errorMessage}`,
          );

          // Jika terjadi konflik atau error, bersihkan sesi dan mulai ulang
          if (errorMessage.includes('conflict') || statusCode === 409 || statusCode === 440) {
            this.logger.log('Detected conflict with another session, cleaning all session files');
            await this.cleanupSessionFiles();
          }

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.logger.log(`Reconnecting in ${this.retryDelay / 1000} seconds...`);

            setTimeout(async () => {
              await this.connect();
            }, this.retryDelay);
          } else if (this.retryCount >= this.maxRetries) {
            this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
            this.connectionStatus = 'error';
          } else {
            this.logger.error('User logged out from WhatsApp. Need to scan QR code again.');
            // Hapus file sesi saat logout
            await this.cleanupSessionFiles();
            // Coba sambungkan lagi
            setTimeout(async () => {
              this.retryCount = 0;
              await this.connect();
            }, this.retryDelay);
          }
        }
      });

      this.client.ev.on('creds.update', saveCreds);
    } catch (error) {
      this.isConnecting = false;
      this.connectionStatus = 'error';
      this.logger.error(`Error connecting to WhatsApp: ${error.message}`);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.logger.log(`Retrying connection in ${this.retryDelay / 1000} seconds...`);

        setTimeout(async () => {
          await this.connect();
        }, this.retryDelay);
      } else {
        this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
      }
    }
  }

  private async cleanupSessionFiles() {
    try {
      const creds = `${this.sessionPath}/creds.json`;
      if (fs.existsSync(creds)) {
        this.logger.log('Backing up creds.json before cleanup');
        const backupPath = `${this.sessionPath}/creds.json.bak.${Date.now()}`;
        fs.copyFileSync(creds, backupPath);
      }

      // Hapus file sesi yang berpotensi rusak
      const appStateFiles = [
        'app-state-sync-version-regular.json',
        'app-state-sync-version-regular_high.json',
        'app-state-sync-version-critical_unblock_low.json',
        'app-state-sync-version-critical_block.json',
        'app-state-sync-version-critical.json',
        'session-',
      ];

      // Baca semua file di direktori sesi
      const files = fs.readdirSync(this.sessionPath);

      // Hapus file yang cocok dengan pola
      for (const file of files) {
        if (appStateFiles.some(pattern => file.startsWith(pattern)) || file.endsWith('.json')) {
          const filePath = `${this.sessionPath}/${file}`;
          this.logger.log(`Removing potentially corrupted file: ${file}`);
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      this.logger.error(`Error cleaning up session files: ${error.message}`);
    }
  }

  async sendMessage(to: string, message: string) {
    if (!this.client) {
      this.logger.error('WhatsApp client is not initialized');
      throw new Error('WhatsApp client is not initialized');
    }

    try {
      this.logger.log(`Sending message to ${to}`);
      const result = await Promise.race([
        this.client.sendMessage(to, { text: message }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Send message timeout')), 30000),
        ),
      ]);

      this.logger.log(`Message sent successfully to ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message to ${to}: ${error.message}`);

      if (
        error.message.includes('Connection Closed') ||
        error.message.includes('lost connection') ||
        error.message.includes('Timed Out') ||
        error.message.includes('Send message timeout')
      ) {
        this.logger.log('Connection issue detected, attempting to reconnect...');

        if (error.message.includes('Timed Out') || error.message.includes('Send message timeout')) {
          await this.resetConnection();
        } else {
          await this.connect();
        }
      }

      return null;
    }
  }

  async sendToAdmin(message: string) {
    if (!this.adminNumber) {
      this.logger.error('Admin WhatsApp number not configured');
      return null;
    }

    return this.sendMessage(this.adminNumber, message);
  }
}
