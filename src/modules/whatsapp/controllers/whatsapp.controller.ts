import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from '../services/whatsapp.service';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import type { WhatsappMessageData } from '../../../common/interfaces/whatsapp.interface';

class TestMenuDto {
  phone: string;
  message?: string;
}

const webhookExample = {
  event: 'onmessage',
  data: {
    from: '6285258725454@c.us',
    body: 'menu',
    fromMe: false,
    type: 'chat',
  },
};

const webhookAlternativeExample = {
  data: {
    sender: {
      id: {
        serialized: '6285258725454@c.us',
      },
    },
    body: 'menu',
    fromMe: false,
  },
};

const webhookReplyExample = {
  event: 'onmessage',
  data: {
    from: '6285258725454@c.us',
    body: 'Terima kasih infonya',
    fromMe: false,
    type: 'chat',
    quotedMsg: {
      type: 'chat',
      body: 'Ini pesan sebelumnya',
      from: '628123456789@c.us',
    },
  },
};

const testMenuExample = {
  phone: '6285258725454@c.us',
  message: 'menu',
};

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('session-status')
  @ApiOperation({ summary: 'Mendapatkan status sesi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status sesi WhatsApp' })
  async getSessionStatus() {
    try {
      return await this.whatsappService.getSessionStatus();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Mendapatkan QR code untuk koneksi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR code koneksi WhatsApp' })
  async getQrCode() {
    try {
      return await this.whatsappService.getQrCode();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('start-all')
  @ApiOperation({ summary: 'Memulai semua sesi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Semua sesi WhatsApp berhasil dimulai' })
  async startAllSessions() {
    try {
      return await this.whatsappService.startAllSessions();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('all-sessions')
  @ApiOperation({ summary: 'Mendapatkan semua sesi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Daftar semua sesi WhatsApp' })
  async getAllSessions() {
    try {
      return await this.whatsappService.getAllSessions();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get('reset-session')
  @ApiOperation({ summary: 'Reset semua sesi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Semua sesi WhatsApp berhasil direset' })
  async resetSession() {
    try {
      return await this.whatsappService.resetConnection();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('logout-session')
  @ApiOperation({ summary: 'Logout dari sesi WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Berhasil logout dari sesi WhatsApp' })
  async logoutSession() {
    try {
      return await this.whatsappService.logoutSession();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('chats')
  @ApiOperation({ summary: 'Mendapatkan daftar chat WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Daftar chat WhatsApp' })
  async getChats() {
    try {
      return await this.whatsappService.getChats();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('contact/:phone')
  @ApiOperation({ summary: 'Mendapatkan detail kontak WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Detail kontak WhatsApp' })
  async getContact(@Param('phone') phone: string) {
    try {
      return await this.whatsappService.getContact(phone);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Mengirim pesan WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pesan WhatsApp berhasil dikirim' })
  async sendMessage(@Body() body: { to: string; message: string }) {
    try {
      const { to, message } = body;
      return await this.whatsappService.sendMessage(to, message);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('send-to-admin')
  @ApiOperation({ summary: 'Mengirim pesan WhatsApp ke admin' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pesan WhatsApp berhasil dikirim ke admin' })
  async sendToAdmin(@Body() body: { message: string }) {
    try {
      const { message } = body;
      return await this.whatsappService.sendToAdmin(message);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook untuk menerima notifikasi dari WPPConnect' })
  @ApiResponse({ status: 200, description: 'Webhook berhasil diproses' })
  @ApiBody({
    description: 'Data webhook dari WPPConnect',
    schema: {},
    examples: {
      standard: {
        value: webhookExample,
        summary: 'Format WPPConnect',
      },
      withReply: {
        value: webhookReplyExample,
        summary: 'Format WPPConnect dengan balasan',
      },
      alternative: {
        value: webhookAlternativeExample,
        summary: 'Format Alternatif',
      },
    },
  })
  async receiveWebhook(@Body() webhookData: any) {
    try {
      this.logger.log(`Menerima webhook data: ${JSON.stringify(webhookData)}`);

      if (!webhookData) {
        this.logger.warn('Invalid webhook data: null or undefined');
        return { status: 'error', message: 'Invalid webhook data' };
      }

      const event = webhookData.event || 'unknown';
      this.logger.log(`Jenis event webhook: ${event}`);

      switch (event) {
        case 'onmessage': {
          let from = '';
          let body = '';
          let messageData = {};
          let isReply = false;
          let quotedMessage: any = null;

          if (webhookData.event === 'onmessage') {
            from = webhookData.data?.from || webhookData.from || webhookData.sender?.id || '';
            body = webhookData.data?.body || webhookData.body || webhookData.content || '';

            messageData = webhookData.data || webhookData;

            this.logger.log(`Extracted message info: from=${from}, body=${body}`);

            if (webhookData.data?.quotedMsg || webhookData.quotedMsg) {
              isReply = true;
              quotedMessage = webhookData.data?.quotedMsg || webhookData.quotedMsg;
              this.logger.log(
                `Pesan merupakan balasan dari: ${typeof quotedMessage === 'object' && quotedMessage ? quotedMessage.body || 'Tidak ada isi pesan' : 'Tidak ada isi pesan'}`,
              );
            }
          } else if (webhookData.data && webhookData.data.sender) {
            from = webhookData.data.sender?.id?.serialized || webhookData.data.sender?.id || '';
            body = webhookData.data.body || webhookData.data.content || '';
            messageData = webhookData.data;

            if (webhookData.data.quotedMessageId || webhookData.data.quotedMessage) {
              isReply = true;
              quotedMessage = webhookData.data.quotedMessage || {
                id: webhookData.data.quotedMessageId,
              };
              this.logger.log(`Pesan merupakan balasan (format alternatif)`);
            }
          } else {
            from = webhookData.from || '';
            body = webhookData.body || '';
            messageData = webhookData;

            if (from && body) {
              this.logger.log(
                `Detected possible WPP Connect v2 format. Using from=${from}, body=${body}`,
              );
            } else {
              this.logger.warn(`Format webhook tidak dikenali: ${JSON.stringify(webhookData)}`);
              return { status: 'warning', message: 'Webhook format not recognized' };
            }
          }

          if (isReply) {
            messageData = {
              ...messageData,
              isReply,
              quotedMessage,
            };
          }

          const messageDataObj: WhatsappMessageData = {
            from,
            message: body,
            messageData,
          };

          if (!from || !body) {
            this.logger.warn('Invalid message data: missing from or body');
            return {
              status: 'error',
              message: 'Missing required message data (from or body field)',
            };
          }

          this.logger.log(`Processing incoming message: from=${from}, body=${body}`);

          this.whatsappService.processIncomingMessage(messageDataObj).catch(error => {
            this.logger.error(`Error processing message asynchronously: ${error.message}`);
          });

          return {
            status: 'success',
            message: 'Webhook processed successfully',
            isReply: isReply,
          };
        }

        case 'onack': {
          this.logger.log(`Received ACK notification: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'ACK notification received' };
        }

        case 'onpresencechanged': {
          this.logger.log(`Presence changed: ${JSON.stringify(webhookData.data || webhookData)}`);

          return { status: 'success', message: 'Presence change notification received' };
        }

        case 'onparticipantschanged': {
          this.logger.log(`Group participants changed: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Group participants change notification received' };
        }

        case 'onreactionmessage': {
          this.logger.log(`Message reaction: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Message reaction notification received' };
        }

        case 'onpollresponse': {
          this.logger.log(`Poll response: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Poll response notification received' };
        }

        case 'onrevokedmessage': {
          this.logger.log(`Message revoked: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Message revoke notification received' };
        }

        case 'onlabelupdated': {
          this.logger.log(`Label updated: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Label update notification received' };
        }

        case 'onselfmessage': {
          this.logger.log(`Self message: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Self message notification received' };
        }

        case 'incomingcall': {
          this.logger.log(`Incoming call: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Incoming call notification received' };
        }

        default: {
          this.logger.log(`Received other event type: ${event}`);
          return { status: 'success', message: `Received ${event} event` };
        }
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      return { status: 'error', message: `Failed to process webhook: ${error.message}` };
    }
  }

  @Post('test-menu')
  @ApiOperation({ summary: 'Tes menu WhatsApp bot' })
  @ApiResponse({ status: 200, description: 'Menu tes berhasil dikirim' })
  @ApiResponse({ status: 400, description: 'Error: Bad Request' })
  @ApiBody({
    type: TestMenuDto,
    description: 'Data tes menu',
    examples: {
      testMenuExample: {
        value: testMenuExample,
        summary: 'Contoh permintaan tes menu',
      },
    },
  })
  async testMenu(@Body() body: TestMenuDto) {
    try {
      if (!body || !body.phone) {
        throw new HttpException('Nomor telepon diperlukan untuk tes menu', HttpStatus.BAD_REQUEST);
      }

      const phone = body.phone;
      const message = body.message || 'menu';

      const dummyData = {
        fromMe: false,
        sender: {
          id: {
            serialized: phone,
          },
        },
        body: message,
      };

      const messageDataObj: WhatsappMessageData = {
        from: phone,
        message,
        messageData: dummyData,
      };

      await this.whatsappService.processIncomingMessage(messageDataObj);

      return {
        status: 'success',
        message: `Pesan tes "${message}" berhasil diproses untuk nomor ${phone}`,
      };
    } catch (error) {
      throw new HttpException(`Gagal memproses tes menu: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('test-conversation')
  @ApiOperation({ summary: 'Tes percakapan menu WhatsApp bot dan balasan' })
  @ApiResponse({ status: 200, description: 'Simulasi percakapan berhasil diproses' })
  @ApiResponse({ status: 400, description: 'Error: Bad Request' })
  async testConversation() {
    try {
      const phone = '6285232152313@c.us';
      this.logger.log(`Memulai tes percakapan dengan nomor ${phone}`);

      const menuResult = await this.whatsappService.sendMessage(phone, 'menu');
      if (!menuResult) {
        throw new HttpException('Gagal mengirim menu', HttpStatus.BAD_REQUEST);
      }
      this.logger.log(`Menu berhasil dikirim ke ${phone}`);

      const menuMessageId = menuResult.id || Date.now().toString();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const replyData = {
        event: 'onmessage',
        data: {
          from: phone,
          body: '1',
          fromMe: true,
          type: 'chat',
          quotedMsg: {
            type: 'chat',
            body: 'menu',
            from: phone,
            id: menuMessageId,
          },
        },
      };

      await this.receiveWebhook(replyData);

      return {
        status: 'success',
        message: `Simulasi percakapan berhasil diproses untuk nomor ${phone}`,
        steps: [
          'Mengirim menu ke nomor target',
          'Simulasi pengguna membalas dengan opsi 1',
          'Melihat respons dari sistem terhadap balasan',
        ],
      };
    } catch (error) {
      this.logger.error(`Gagal mengeksekusi tes percakapan: ${error.message}`);
      throw new HttpException(
        `Gagal mengeksekusi tes percakapan: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('send-direct-menu/:phone')
  @ApiOperation({ summary: 'Kirim menu langsung ke nomor tertentu' })
  @ApiResponse({ status: 200, description: 'Menu berhasil dikirim' })
  @ApiResponse({ status: 400, description: 'Error: Bad Request' })
  async sendDirectMenu(@Param('phone') phone: string) {
    try {
      if (!phone) {
        throw new HttpException('Nomor telepon diperlukan', HttpStatus.BAD_REQUEST);
      }

      let formattedPhone = phone;
      if (!phone.includes('@c.us')) {
        formattedPhone = `${phone.replace(/^0/, '62')}@c.us`;
      }

      this.logger.log(`Mengirim menu langsung ke ${formattedPhone}`);

      const menuText =
        `🏍️ *ROSANTIBIKE MOTORRENT* 🏍️\n\n` +
        `Silakan pilih menu berikut:\n` +
        `1️⃣ Cek Daftar Motor\n` +
        `2️⃣ Cek Harga Sewa\n` +
        `3️⃣ Info Pemesanan\n` +
        `4️⃣ Status Transaksi\n` +
        `5️⃣ Bantuan\n\n` +
        `Balas dengan nomor menu yang diinginkan.`;

      const result = await this.whatsappService.sendMessage(formattedPhone, menuText);

      if (!result) {
        throw new HttpException('Gagal mengirim menu', HttpStatus.BAD_REQUEST);
      }

      return {
        status: 'success',
        message: `Menu berhasil dikirim ke ${formattedPhone}`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Gagal mengirim menu langsung: ${error.message}`);
      throw new HttpException(
        `Gagal mengirim menu langsung: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
