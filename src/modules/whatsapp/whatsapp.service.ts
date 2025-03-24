import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import * as fs from 'fs';
import * as qrcodeTerminal from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private client: ReturnType<typeof makeWASocket>;
  private readonly sessionPath: string;
  private readonly adminNumber: string;

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
      this.client.end(new Error('Service destroyed'));
    }
  }

  private async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

    this.client = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      qrTimeout: 60000,
    });

    this.client.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Tampilkan QR code di terminal
        qrcodeTerminal.generate(qr, { small: true });
        console.log(`QR code: ${qr}`);
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          await this.connect();
        }
      }
    });

    this.client.ev.on('creds.update', saveCreds);
  }

  async sendMessage(to: string, message: string) {
    if (!this.client) {
      throw new Error('WhatsApp client is not initialized');
    }

    try {
      await this.client.sendMessage(to, { text: message });
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  async sendToAdmin(message: string) {
    if (!this.adminNumber) {
      throw new Error('Admin WhatsApp number is not configured');
    }

    return this.sendMessage(this.adminNumber, message);
  }
}
