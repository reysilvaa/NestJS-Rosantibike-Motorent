import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import { WhatsappMessagingService } from './whatsapp-messaging.service';
import { WhatsappHandlerService } from './whatsapp-handler.service';
import type { WhatsappMessageData } from '../../../common/interfaces/whatsapp.interface';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionService: WhatsappConnectionService,
    private readonly messagingService: WhatsappMessagingService,
    private readonly handlerService: WhatsappHandlerService,
  ) {}

  async onModuleInit() {
    try {
      await this.connectionService.connect();
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Shutting down WhatsApp client');
      await this.connectionService.closeSession();
    } catch (error) {
      this.logger.error(`Error closing WhatsApp session: ${error.message}`);
    }
  }

  // Connection methods
  getConnectionStatus() {
    return this.connectionService.getConnectionStatus();
  }

  getLastQrCode() {
    return this.connectionService.getLastQrCode();
  }

  async getSessionStatus() {
    return this.connectionService.getSessionStatus();
  }

  async resetConnection() {
    return this.connectionService.resetConnection();
  }

  async initialize() {
    return this.connectionService.initialize();
  }

  async startAllSessions() {
    return this.connectionService.startAllSessions();
  }

  async getAllSessions() {
    return this.connectionService.getAllSessions();
  }

  async logoutSession() {
    return this.connectionService.logoutSession();
  }

  // Messaging methods
  async sendMessage(to: string, message: string) {
    return this.messagingService.sendMessage(to, message);
  }

  async sendToAdmin(message: string) {
    return this.messagingService.sendToAdmin(message);
  }

  async getChats() {
    return this.messagingService.getChats();
  }

  async getMessagesInChat(phone: string) {
    return this.messagingService.getMessagesInChat(phone);
  }

  async getContact(phone: string) {
    return this.messagingService.getContact(phone);
  }

  // Message handler methods
  async processIncomingMessage(messageData: WhatsappMessageData) {
    return this.handlerService.processIncomingMessage(
      messageData.from,
      messageData.message,
      messageData.messageData,
    );
  }
}
