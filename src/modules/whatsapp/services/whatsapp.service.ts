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

  getConnectionStatus() {
    return this.connectionService.getConnectionStatus();
  }

  getQrCode() {
    return this.connectionService.getQrCode();
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

  async processIncomingMessage(messageData: WhatsappMessageData) {
    if (!messageData) {
      this.logger.warn('Received empty message data, ignoring');
      return;
    }

    const eventType = messageData.messageData?.event || '';
    const nonMessageEvents = [
      'onpresencechanged',
      'onack',
      'onreactionmessage',
      'onstate',
      'onstatusmsg',
      'onlivelocationsharestop',
    ];

    if (nonMessageEvents.includes(eventType)) {
      this.logger.log(`Ignoring non-message event: ${eventType}`);
      return;
    }

    if (!messageData.from || !messageData.message) {
      this.logger.warn(
        `Invalid message data, missing from or message: ${JSON.stringify(messageData)}`,
      );
      return;
    }

    if (messageData.from === '@c.us') {
      this.logger.warn(`Invalid sender format: ${messageData.from}`);
      return;
    }

    return this.handlerService.processIncomingMessage(
      messageData.from,
      messageData.message,
      messageData.messageData,
    );
  }
}
