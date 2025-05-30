import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { WhatsappConnectionService } from './whatsapp-connection.service';

@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(private readonly connectionService: WhatsappConnectionService) {}

  /**
   * Mengirim pesan WhatsApp
   */
  async sendMessage(to: string, message: string) {
    if (!this.connectionService.isConnected()) {
      this.logger.error('WhatsApp is not connected');
      throw new Error('WhatsApp is not connected');
    }

    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

      // Cek apakah nomor sudah berisi @s@c.us.net atau @c.us
      let whatsappId;
      if (!to) {
        this.logger.error('Invalid phone number: empty');
        throw new Error('Invalid phone number: empty');
      }

      if (to.includes('@')) {
        whatsappId = to; // Sudah berformat lengkap untuk WPP Connect
      } else {
        // Format nomor dengan benar untuk WPPConnect
        whatsappId = `${to}@c.us`;
      }

      // Validasi nomor untuk mencegah format yang tidak valid
      if (whatsappId === '@c.us') {
        this.logger.error(`Invalid phone number format: ${to}`);
        throw new Error('Invalid phone number format');
      }

      this.logger.log(`Sending message to ${whatsappId}`);

      // Implementasi retry untuk pengiriman pesan
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;

      while (attempts < maxAttempts) {
        try {
          const response = await axios.post(
            `${config.baseUrl}/api/${config.session}/send-message`,
            {
              phone: whatsappId,
              message: message,
              // Tambahkan parameter untuk memastikan pesan terkirim
              waitForAck: true,
            },
            {
              headers: {
                accept: 'application/json',
                contentType: 'application/json',
                authorization: `Bearer ${token}`,
              },
              timeout: 60_000, // Timeout 60 detik
            },
          );

          if (response.data && response.data.status === 'success') {
            this.logger.log(`Message sent successfully to ${whatsappId}`);
            return response.data;
          } else {
            lastError = new Error(`Failed to send message: ${JSON.stringify(response.data)}`);
            attempts++;
            this.logger.warn(`Send attempt ${attempts} failed: non-success response`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        } catch (error) {
          lastError = error;
          attempts++;
          this.logger.warn(`Send attempt ${attempts} failed: ${error.message}`);

          if (attempts < maxAttempts) {
            this.logger.log(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }
      }

      // Jika semua percobaan gagal
      this.logger.error(`Failed to send after ${maxAttempts} attempts to ${to}`);
      throw lastError || new Error('Failed to send message after multiple attempts');
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
          await this.connectionService.generateToken();
        }

        if (error.message.includes('Timed Out') || error.message.includes('timeout')) {
          await this.connectionService.resetConnection();
        } else {
          await this.connectionService.connect();
        }
      }

      return null;
    }
  }

  /**
   * Mengirim pesan ke admin
   */
  async sendToAdmin(message: string) {
    try {
      const config = this.connectionService.getConfig();

      if (!config.adminNumber) {
        this.logger.warn('Admin WhatsApp number is not configured');
        return false;
      }

      // Format admin number
      // Gunakan nomor admin langsung dan serahkan formatting ke sendMessage
      const adminNumber = config.adminNumber;

      // Send message to admin
      return await this.sendMessage(adminNumber, message);
    } catch (error) {
      this.logger.error(`Error sending message to admin: ${error.message}`);
      return false;
    }
  }

  /**
   * Mendapatkan daftar chat
   */
  async getChats() {
    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

      const response = await axios.post(
        `${config.baseUrl}/api/${config.session}/list-chats`,
        {},
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${token}`,
          },
        },
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
    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

      // Gunakan nomor langsung, karena sudah diformat saat disimpan
      // Tetapi perlu cek apakah perlu tambahkan suffix @s@c.us.net
      const formattedId = phone.includes('@') ? phone : `${phone}`;

      const response = await axios.get(
        `${config.baseUrl}/api/${config.session}/all-messages-in-chat/${formattedId}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${token}`,
          },
        },
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
    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

      // Gunakan nomor langsung, karena sudah diformat saat disimpan
      // Tetapi perlu cek apakah perlu tambahkan suffix @s@c.us.net
      const formattedId = phone.includes('@') ? phone : `${phone}`;

      const response = await axios.get(
        `${config.baseUrl}/api/${config.session}/contact/${formattedId}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting contact ${phone}: ${error.message}`);
      return null;
    }
  }
}
