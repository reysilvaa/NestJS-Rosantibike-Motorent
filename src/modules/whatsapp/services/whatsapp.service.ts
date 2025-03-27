import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  type ConnectionState,
} from 'baileys';
import { Boom } from '@hapi/boom';
import type { JidWithDevice } from 'baileys';
import * as qrcodeTerminal from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';

const appStateFiles = [
  'app-state-sync-version-',
  'app-state-sync-key-',
  'sender-key-',
  'sender-key-memory-',
  'session-',
];

// Verbose logger untuk melihat debug info dari Baileys
const verboseLogger = {
  level: 'debug',
  trace: (msg, ...args) => console.log(`[BAILEYS TRACE] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[BAILEYS DEBUG] ${msg}`, ...args),
  info: (msg, ...args) => console.log(`[BAILEYS INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.log(`[BAILEYS WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[BAILEYS ERROR] ${msg}`, ...args),
  fatal: (msg, ...args) => console.error(`[BAILEYS FATAL] ${msg}`, ...args),
  child: () => verboseLogger,
};

// Silent logger untuk mematikan log dari Baileys
const silentLogger = {
  level: 'silent',
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => silentLogger,
};

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private client: ReturnType<typeof makeWASocket>;
  private readonly sessionPath: string;
  private readonly adminNumber: string;
  private readonly logger = new Logger(WhatsappService.name);
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
  private qrCodeSent = false;
  private lastQrTimestamp = 0;
  private qrMinInterval = 30000;
  private lastQrCode: string | null = null;
  private qrHistory: Set<string> = new Set();
  private hasRegisteredListeners = false;
  private authenticationInProgress = false;
  private sendDebugMessages = false;

  constructor(private readonly configService: ConfigService) {
    this.sessionPath = configService.get('WHATSAPP_SESSION_PATH') || './storage/whatsapp-session';

    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    this.adminNumber = configService.get('ADMIN_WHATSAPP') || '';

    this.sendDebugMessages = configService.get('WHATSAPP_SEND_DEBUG') === 'true';

    this.retryDelay = parseInt(configService.get('WHATSAPP_RECONNECT_INTERVAL') || '60000', 10);
    this.maxRetries = parseInt(configService.get('WHATSAPP_MAX_RECONNECT_ATTEMPTS') || '10', 10);

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
    if (this.client) {
      this.logger.log('Shutting down WhatsApp client');
      this.client.end(new Error('Application shutting down'));
    }
  }

  async resetConnection() {
    this.logger.log('Resetting WhatsApp connection...');
    this.retryCount = 0;
    this.qrCodeSent = false;
    this.lastQrCode = null;
    this.isConnecting = false;
    this.reconnectAttemptInProgress = false;
    this.authenticationInProgress = false;

    if (this.client) {
      try {
        this.logger.log('Closing previous WhatsApp connection');
        this.client.end(new Error('Connection reset'));
      } catch (error) {
        this.logger.error(`Error closing connection: ${error.message}`);
      }
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
      authenticationInProgress: this.authenticationInProgress,
      hasQrCode: !!this.lastQrCode,
    };
  }

  getLastQrCode() {
    return this.lastQrCode;
  }

  private async connect() {
    if (this.isConnecting) {
      this.logger.log('Connection attempt already in progress');
      return;
    }

    if (this.reconnectAttemptInProgress) {
      this.logger.log('Reconnect already scheduled, ignoring additional connect request');
      return;
    }

    if (this.authenticationInProgress) {
      this.logger.log('Authentication in progress, ignoring connect request');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';

    try {
      this.logger.log(`Connecting to WhatsApp (Attempt ${this.retryCount + 1}/${this.maxRetries})`);

      if (this.retryCount > 0) {
        this.logger.log('Cleaning up session files before reconnecting');
        await this.cleanupSessionFiles();
        this.qrCodeSent = false;
        this.qrHistory.clear();
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      if (this.client) {
        try {
          this.logger.log('Closing previous WhatsApp connection');
          this.client.end(new Error('Creating new connection'));
        } catch (error) {
          this.logger.error(`Error closing previous connection: ${error.message}`);
        }
      }

      this.client = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        qrTimeout: 90000,
        connectTimeoutMs: 180000,
        retryRequestDelayMs: 2000,
        defaultQueryTimeoutMs: 180000,
        keepAliveIntervalMs: 60000,
        browser: ['Rental App', 'Chrome', '108.0.0'],
        syncFullHistory: false,
        logger: verboseLogger,
        markOnlineOnConnect: true,
        transactionOpts: {
          maxCommitRetries: 10,
          delayBetweenTriesMs: 3000,
        },
        patchMessageBeforeSending: msg => {
          const anyMsg = msg as any;
          if (anyMsg && anyMsg.buttonText) {
            anyMsg.buttonText = anyMsg.buttonText || '';
          }
          return msg;
        },
      });

      this.client.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        this.logger.log(
          `Connection update: ${JSON.stringify({
            connection,
            statusCode: (lastDisconnect?.error as Boom)?.output?.statusCode,
            errorMessage: (lastDisconnect?.error as Boom)?.output?.payload?.message || '',
            hasQr: !!qr,
          })}`,
        );

        if (qr && !this.authenticationInProgress) {
          const currentTime = Date.now();

          const isDuplicateQr = this.qrHistory.has(qr);
          const intervalPassed = currentTime - this.lastQrTimestamp > this.qrMinInterval;

          this.logger.log(
            `QR Update: isDuplicate=${isDuplicateQr}, qrSent=${this.qrCodeSent}, intervalPassed=${intervalPassed}, historySize=${this.qrHistory.size}`,
          );

          if ((!this.qrCodeSent || intervalPassed) && !isDuplicateQr) {
            this.logger.log('New QR Code received, generating...');
            qrcodeTerminal.generate(qr, { small: true });
            this.qrCodeSent = true;
            this.lastQrTimestamp = currentTime;
            this.lastQrCode = qr;
            this.qrHistory.add(qr);

            if (this.qrHistory.size > 10) {
              const oldestQrs = Array.from(this.qrHistory).slice(0, 5);
              oldestQrs.forEach(oldQr => this.qrHistory.delete(oldQr));
            }
          } else {
            this.logger.log(
              `Ignoring QR code - ${isDuplicateQr ? 'already shown before' : 'time interval not met'}`,
            );
          }
        } else if (qr && this.authenticationInProgress) {
          this.logger.log('QR code scan detected, authentication in progress');
          this.connectionStatus = 'authenticated';
        }

        if (connection === 'connecting') {
          this.logger.log('WhatsApp connecting...');
        } else if (connection === 'open') {
          this.logger.log('WhatsApp connection established successfully');
          this.retryCount = 0;
          this.isConnecting = false;
          this.connectionStatus = 'connected';
          this.authenticationInProgress = false;
          this.lastQrCode = null;
          this.qrCodeSent = false;

          if (this.sendDebugMessages) {
            setTimeout(() => {
              this.sendToAdmin('WhatsApp berhasil terhubung').catch(err =>
                this.logger.error(`Failed to send connection notification: ${err.message}`),
              );
            }, 5000);
          }
        } else if (connection === 'close') {
          this.isConnecting = false;

          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = (lastDisconnect?.error as Boom)?.output?.payload?.message || '';

          if (statusCode === 515 && errorMessage.includes('Stream Errored')) {
            this.logger.log(
              'Stream error 515 terdeteksi setelah pairing. Ini perilaku normal WhatsApp, melakukan reconnect...',
            );

            this.authenticationInProgress = false;
            this.connectionStatus = 'reconnecting';
            this.reconnectAttemptInProgress = true;

            setTimeout(async () => {
              this.reconnectAttemptInProgress = false;
              await this.connect();
            }, 5000);
            return;
          }

          if (this.authenticationInProgress && statusCode !== 515) {
            this.logger.log(
              'Connection close detected, but authentication in progress. Waiting...',
            );
            return;
          }

          this.connectionStatus = 'disconnected';
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.logger.error(
            `WhatsApp connection closed. Status code: ${statusCode}, Message: ${errorMessage}`,
          );

          if (statusCode === 401 || statusCode === 428) {
            this.logger.log('Authentication issue detected (QR scan related)');
            await this.cleanupSessionFiles();
            this.qrCodeSent = false;
            this.authenticationInProgress = false;

            setTimeout(async () => {
              await this.connect();
            }, this.retryDelay);
            return;
          }

          if (errorMessage.includes('conflict') || statusCode === 409 || statusCode === 440) {
            this.logger.log('Detected conflict with another session, cleaning all session files');
            await this.cleanupSessionFiles();
            this.qrCodeSent = false;
            this.authenticationInProgress = false;
          }

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.connectionStatus = 'reconnecting';
            this.logger.log(
              `Akan mencoba menghubungkan kembali dalam ${this.retryDelay / 1000} detik... (Percobaan ${this.retryCount}/${this.maxRetries})`,
            );

            this.reconnectAttemptInProgress = true;

            setTimeout(async () => {
              this.reconnectAttemptInProgress = false;
              this.authenticationInProgress = false;
              await this.connect();
            }, this.retryDelay);
          } else if (!shouldReconnect) {
            this.logger.error('User logged out from WhatsApp. Need to scan QR code again.');
            await this.cleanupSessionFiles();
            this.connectionStatus = 'disconnected';
            this.retryCount = 0;
            this.qrCodeSent = false;

            setTimeout(async () => {
              await this.connect();
            }, this.retryDelay);
          } else {
            this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
            this.connectionStatus = 'error';
          }
        }
      });

      this.client.ev.on('creds.update', saveCreds);
    } catch (error) {
      this.isConnecting = false;
      this.logger.error(`Error connecting to WhatsApp: ${error.message}`);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
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
  }

  private async cleanupSessionFiles() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        this.logger.log(`Creating session directory: ${this.sessionPath}`);
        fs.mkdirSync(this.sessionPath, { recursive: true });
        return;
      }

      const files = fs.readdirSync(this.sessionPath);

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
      let formattedNumber = to;

      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.substring(1);
      }

      if (!formattedNumber.includes('@')) {
        formattedNumber = `${formattedNumber}@s.whatsapp.net`;
      }

      this.logger.log(`Sending message to ${to} (formatted: ${formattedNumber})`);
      const result = await Promise.race([
        this.client.sendMessage(formattedNumber, { text: message }),
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
      adminNumber = adminNumber.substring(1);
    }

    if (!adminNumber.includes('@')) {
      adminNumber = `${adminNumber}@s.whatsapp.net`;
    }

    this.logger.log(`Sending to admin: ${this.adminNumber} (formatted: ${adminNumber})`);
    return this.sendMessage(adminNumber, message);
  }
}
