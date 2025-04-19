import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import { formatWhatsappNumber } from '../../../common/helpers/whatsapp-formatter.helper';

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
      const formattedNumber = formatWhatsappNumber(to);

      this.logger.log(`Sending message to ${to} (formatted: ${formattedNumber})`);

      const response = await axios.post(
        `${config.baseUrl}/api/${config.session}/send-message`,
        {
          phone: formattedNumber,
          message: message,
        },
        {
          headers: {
            accept: 'application/json',
            contentType: 'application/json',
            authorization: `Bearer ${token}`,
          },
          timeout: 30_000,
        },
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
      const adminWhatsapp = config.adminNumber.startsWith('+')
        ? config.adminNumber.slice(1)
        : config.adminNumber;
      const whatsappId = `${adminWhatsapp}@s.whatsapp.net`;

      // Send message to admin
      return await this.sendMessage(whatsappId, message);
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
      const formattedNumber = formatWhatsappNumber(phone);

      const response = await axios.get(
        `${config.baseUrl}/api/${config.session}/all-messages-in-chat/${formattedNumber}`,
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
      const formattedNumber = formatWhatsappNumber(phone);

      const response = await axios.get(
        `${config.baseUrl}/api/${config.session}/contact/${formattedNumber}`,
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
