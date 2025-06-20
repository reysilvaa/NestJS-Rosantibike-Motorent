import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { WhatsappConnectionService } from './whatsapp-connection.service';

@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(private readonly connectionService: WhatsappConnectionService) {}

  async sendMessage(to: string, message: string) {
    if (!this.connectionService.isConnected()) {
      this.logger.error('WhatsApp is not connected');
      throw new Error('WhatsApp is not connected');
    }

    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

      let whatsappId;
      if (!to) {
        this.logger.error('Invalid phone number: empty');
        throw new Error('Invalid phone number: empty');
      }

      if (to.includes('@')) {
        whatsappId = to;
      } else {
        whatsappId = `${to}@c.us`;
      }

      if (whatsappId === '@c.us') {
        this.logger.error(`Invalid phone number format: ${to}`);
        throw new Error('Invalid phone number format');
      }

      this.logger.log(`Sending message to ${whatsappId}`);

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

              waitForAck: true,
            },
            {
              headers: {
                accept: 'application/json',
                contentType: 'application/json',
                authorization: `Bearer ${token}`,
              },
              timeout: 60_000,
            },
          );

          if (response.data && response.data.status === 'success') {
            this.logger.log(`Message sent successfully to ${whatsappId}`);
            return response.data;
          } else {
            lastError = new Error(`Failed to send message: ${JSON.stringify(response.data)}`);
            attempts++;
            this.logger.warn(`Send attempt ${attempts} failed: non-success response`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          lastError = error;
          attempts++;
          this.logger.warn(`Send attempt ${attempts} failed: ${error.message}`);

          if (attempts < maxAttempts) {
            this.logger.log(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

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

  async sendToAdmin(message: string) {
    try {
      const config = this.connectionService.getConfig();

      if (!config.adminNumber) {
        this.logger.warn('Admin WhatsApp number is not configured');
        return false;
      }

      const adminNumber = config.adminNumber;

      return await this.sendMessage(adminNumber, message);
    } catch (error) {
      this.logger.error(`Error sending message to admin: ${error.message}`);
      return false;
    }
  }

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

  async getMessagesInChat(phone: string) {
    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

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

  async getContact(phone: string) {
    try {
      const token = await this.connectionService.getToken();
      const config = this.connectionService.getConfig();

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
