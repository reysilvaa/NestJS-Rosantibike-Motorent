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
  public maxRetries = 5;
  private retryDelay = 15000; // Meningkatkan delay retry menjadi 15 detik
  private reconnectAttemptInProgress = false; // Flag untuk mencegah multiple reconnect
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'authenticated' = 'disconnected';
  private qrCodeSent = false;
  private lastQrTimestamp = 0;
  private qrMinInterval = 30000; // Meningkatkan interval minimum menjadi 30 detik
  private lastQrCode: string | null = null;
  private qrHistory: Set<string> = new Set(); // Menyimpan history QR yang sudah dikirim
  private hasRegisteredListeners = false; // Flag untuk mencegah listener terdaftar lebih dari sekali
  private authenticationInProgress = false; // Flag untuk menandai proses autentikasi sedang berlangsung

  constructor(private readonly configService: ConfigService) {
    this.sessionPath = this.configService.get('BAILEYS_SESSION_PATH') || './whatsapp-sessions';
    this.adminNumber = this.configService.get('ADMIN_WHATSAPP') || '';

    // Buat direktori session jika belum ada
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async onModuleInit() {
    // Tunda koneksi pertama untuk memastikan sistem sudah siap
    setTimeout(() => {
      this.connect();
    }, 3000);
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
    
    // Reset QR history dan flag
    this.qrCodeSent = false;
    this.qrHistory.clear();
    this.lastQrCode = null;

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
      qrCodeSent: this.qrCodeSent,
      lastQrTimestamp: this.lastQrTimestamp,
      reconnectInProgress: this.reconnectAttemptInProgress
    };
  }

  getLastQrCode() {
    return {
      qrCode: this.lastQrCode,
      timestamp: this.lastQrTimestamp,
      hasQrCode: !!this.lastQrCode
    };
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

      // Hapus file sesi yang rusak jika retry > 1
      if (this.retryCount > 0) {
        this.logger.log('Cleaning up session files before reconnecting');
        await this.cleanupSessionFiles();
        // Reset QR code flag saat mencoba koneksi ulang dengan session baru
        this.qrCodeSent = false;
        this.qrHistory.clear();
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Jika client sudah ada, hapus semua koneksi sebelumnya
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
        printQRInTerminal: false, // Nonaktifkan QR terminal bawaan, kita akan handle sendiri
        qrTimeout: 60000,
        connectTimeoutMs: 120000,
        retryRequestDelayMs: 1000,
        defaultQueryTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
        browser: ['Rental App', 'Chrome', '10.0.0'],
        syncFullHistory: false,
      });

      // Set up event listeners
      this.client.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        // Log semua update untuk debug
        this.logger.log(`Connection update: ${JSON.stringify({
          connection,
          statusCode: (lastDisconnect?.error as Boom)?.output?.statusCode,
          errorMessage: (lastDisconnect?.error as Boom)?.output?.payload?.message || '',
          hasQr: !!qr
        })}`);

        // Jika ada QR code dan kita tidak sedang dalam proses autentikasi
        if (qr && !this.authenticationInProgress) {
          const currentTime = Date.now();
          
          // Cek apakah QR code ini sudah pernah dikirim sebelumnya
          const isDuplicateQr = this.qrHistory.has(qr);
          const intervalPassed = currentTime - this.lastQrTimestamp > this.qrMinInterval;
          
          // Log semua status QR untuk debug
          this.logger.log(`QR Update: isDuplicate=${isDuplicateQr}, qrSent=${this.qrCodeSent}, intervalPassed=${intervalPassed}, historySize=${this.qrHistory.size}`);
          
          // Kondisi lebih ketat: hanya tampilkan jika interval telah lewat DAN QR ini baru
          if ((!this.qrCodeSent || intervalPassed) && !isDuplicateQr) {
            this.logger.log('New QR Code received, generating...');
            qrcodeTerminal.generate(qr, { small: true });
            this.qrCodeSent = true;
            this.lastQrTimestamp = currentTime;
            this.lastQrCode = qr;
            this.qrHistory.add(qr);
            
            // Batasi ukuran history
            if (this.qrHistory.size > 10) {
              const oldestQrs = Array.from(this.qrHistory).slice(0, 5);
              oldestQrs.forEach(oldQr => this.qrHistory.delete(oldQr));
            }
          } else {
            this.logger.log(`Ignoring QR code - ${isDuplicateQr ? 'already shown before' : 'time interval not met'}`);
          }
        } else if (qr && this.authenticationInProgress) {
          // Jika ada QR baru tapi sedang autentikasi, tandai bahwa proses scan sedang berjalan
          this.logger.log('QR code scan detected, authentication in progress');
          this.connectionStatus = 'authenticated';
        }

        if (connection === 'connecting') {
          this.logger.log('WhatsApp connecting...');
        } else if (connection === 'open') {
          this.logger.log('WhatsApp connection established successfully');
          this.retryCount = 0; // Reset retry count on successful connection
          this.isConnecting = false;
          this.connectionStatus = 'connected';
          this.authenticationInProgress = false; // Autentikasi selesai
          this.lastQrCode = null; // Reset QR code saat sudah terkoneksi
          this.qrCodeSent = false;

          // Kirim pesan notifikasi ke admin bahwa koneksi sudah aktif
          setTimeout(() => {
            this.sendToAdmin('WhatsApp berhasil terhubung').catch(err => 
              this.logger.error(`Failed to send connection notification: ${err.message}`)
            );
          }, 5000);
        } else if (connection === 'close') {
          this.isConnecting = false;
          
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = (lastDisconnect?.error as Boom)?.output?.payload?.message || '';
          
          // Jika error 515 (Stream Errored), proses pairing WhatsApp membutuhkan restart koneksi
          // Ini adalah perilaku normal dari Baileys setelah scan QR berhasil
          if (statusCode === 515 && errorMessage.includes('Stream Errored')) {
            this.logger.log('Stream error 515 terdeteksi setelah pairing. Ini perilaku normal WhatsApp, melakukan reconnect...');
            
            // Jangan hapus sesi, karena pairing sudah berhasil
            // Hanya reset flag autentikasi dan lakukan koneksi ulang setelah delay
            this.authenticationInProgress = false;
            this.connectionStatus = 'reconnecting';
            this.reconnectAttemptInProgress = true;
            
            setTimeout(async () => {
              this.reconnectAttemptInProgress = false;
              await this.connect();
            }, 5000); // Gunakan delay lebih pendek (5 detik) untuk reconnect setelah pairing
            return;
          }

          // Jika dalam proses autentikasi, jangan langsung putuskan koneksi
          // KECUALI untuk error 515 yang memang butuh reconnect
          if (this.authenticationInProgress && statusCode !== 515) {
            this.logger.log('Connection close detected, but authentication in progress. Waiting...');
            return;
          }

          this.connectionStatus = 'disconnected';
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.logger.error(
            `WhatsApp connection closed. Status code: ${statusCode}, Message: ${errorMessage}`,
          );

          // Status 401 biasanya karena sesi tidak valid/logout
          // Status 440 adalah Forbidden - sesi berakhir
          // Status 500 adalah server error
          // Status 428 adalah Precondition Required (biasanya terjadi saat QR scan gagal)
          // Conflict 409 terjadi saat ada sesi aktif lain

          // Jika error yang terjadi berkaitan dengan scan QR
          if (statusCode === 401 || statusCode === 428) {
            this.logger.log('Authentication issue detected (QR scan related)');
            // Reset session dan paksa reconnect
            await this.cleanupSessionFiles();
            this.qrCodeSent = false;
            this.authenticationInProgress = false;

            setTimeout(async () => {
              await this.connect();
            }, this.retryDelay);
            return;
          }

          // Jika terjadi konflik atau error, bersihkan sesi dan mulai ulang
          if (errorMessage.includes('conflict') || statusCode === 409 || statusCode === 440) {
            this.logger.log('Detected conflict with another session, cleaning all session files');
            await this.cleanupSessionFiles();
            // Reset QR flag karena session dibersihkan
            this.qrCodeSent = false;
            this.authenticationInProgress = false;
          }

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.connectionStatus = 'reconnecting';
            this.logger.log(`Akan mencoba menghubungkan kembali dalam ${this.retryDelay / 1000} detik... (Percobaan ${this.retryCount}/${this.maxRetries})`);
            
            // Tandai sedang dalam proses reconnect
            this.reconnectAttemptInProgress = true;

            setTimeout(async () => {
              this.reconnectAttemptInProgress = false;
              this.authenticationInProgress = false; // Reset juga flag autentikasi
              await this.connect();
            }, this.retryDelay);
          } else if (this.retryCount >= this.maxRetries) {
            this.logger.error('Maximum retry attempts reached. Giving up on WhatsApp connection.');
            this.connectionStatus = 'error';
            this.authenticationInProgress = false;
          } else {
            this.logger.error('User logged out from WhatsApp. Need to scan QR code again.');
            // Hapus file sesi saat logout
            await this.cleanupSessionFiles();
            // Coba sambungkan lagi dengan delay lebih panjang
            this.reconnectAttemptInProgress = true;
            this.connectionStatus = 'reconnecting';
            this.authenticationInProgress = false;
            
            setTimeout(async () => {
              this.retryCount = 0;
              this.reconnectAttemptInProgress = false;
              await this.connect();
            }, this.retryDelay * 2); // Gunakan delay 2x lebih lama untuk logout
          }
        }
      });

      // Event saat update credentials
      this.client.ev.on('creds.update', async (creds) => {
        this.logger.log('Credentials updated');
        // Jika credentials update, berarti ada perubahan otentikasi
        this.authenticationInProgress = true;
        await saveCreds();
      });
    } catch (error) {
      this.isConnecting = false;
      this.connectionStatus = 'error';
      this.authenticationInProgress = false;
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
      // Reset QR code flag karena session dihapus
      this.qrCodeSent = false;
      this.qrHistory.clear();
      this.lastQrCode = null;
      
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
      // Format nomor WhatsApp dengan benar
      let formattedNumber = to;
      
      // Hapus karakter + di awal jika ada
      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.substring(1);
      }
      
      // Pastikan nomor berformat 'nomor@s.whatsapp.net'
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
    if (!this.adminNumber) {
      this.logger.error('Admin WhatsApp number not configured');
      return null;
    }

    // Format nomor admin
    let adminNumber = this.adminNumber;
    
    // Hapus karakter + di awal jika ada
    if (adminNumber.startsWith('+')) {
      adminNumber = adminNumber.substring(1);
    }
    
    // Tambahkan suffix WhatsApp jika belum ada
    if (!adminNumber.includes('@')) {
      adminNumber = `${adminNumber}@s.whatsapp.net`;
    }
    
    this.logger.log(`Sending to admin: ${this.adminNumber} (formatted: ${adminNumber})`);
    return this.sendMessage(adminNumber, message);
  }
}
