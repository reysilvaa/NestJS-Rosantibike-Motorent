import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { WhatsappService } from '../services/whatsapp.service';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { handleError, logInfo } from '../../../common/helpers';
import { WhatsappMessageData } from '../../../common/interfaces/whatsapp.interface';

// DTO untuk test-menu
class TestMenuDto {
  phone: string;
  message?: string;
}

// Contoh request untuk webhook
const webhookExample = {
  event: 'onmessage',
  data: {
    from: '6285258725454@c.us',
    body: 'menu',
    fromMe: false,
    type: 'chat',
  },
};

// Contoh request alternatif untuk webhook
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

// Contoh request untuk format webhook WPPConnect dengan balasan
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

// Contoh request untuk test-menu
const testMenuExample = {
  phone: '6285258725454@c.us',
  message: 'menu',
};

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Mendapatkan status koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Status koneksi berhasil ditemukan' })
  getStatus() {
    return this.whatsappService.getConnectionStatus();
  }

  @Get('session-status')
  @ApiOperation({ summary: 'Mendapatkan status sesi WhatsApp dari API' })
  @ApiResponse({ status: 200, description: 'Status sesi berhasil ditemukan' })
  async getSessionStatus() {
    const sessionStatus = await this.whatsappService.getSessionStatus();
    return {
      status: 'success',
      data: sessionStatus,
    };
  }

  @Get('qr-code')
  @ApiOperation({ summary: 'Mendapatkan QR code untuk menghubungkan WhatsApp' })
  @ApiResponse({ status: 200, description: 'QR code berhasil diperoleh' })
  @ApiResponse({ status: 404, description: 'QR code tidak tersedia' })
  async getQrCode(@Res() res: Response) {
    const qrCode = this.whatsappService.getLastQrCode();
    
    if (!qrCode) {
      throw new HttpException(
        'QR code tidak tersedia. Mungkin sudah terhubung atau belum siap.',
        HttpStatus.NOT_FOUND,
      );
    }
    
    return res.status(HttpStatus.OK).json({
      status: 'success',
      qrCode,
    });
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Koneksi berhasil di-reset' })
  async resetConnection() {
    await this.whatsappService.resetConnection();
    return {
      status: 'success',
      message: 'Koneksi WhatsApp sedang di-reset',
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout dari sesi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Berhasil logout dari WhatsApp' })
  async logoutSession() {
    const result = await this.whatsappService.logoutSession();
    return {
      status: 'success',
      message: 'Berhasil logout dari WhatsApp',
      data: result,
    };
  }

  @Post('start-all')
  @ApiOperation({ summary: 'Memulai semua sesi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Sesi WhatsApp berhasil dimulai' })
  async startAllSessions() {
    const result = await this.whatsappService.startAllSessions();
    return {
      status: 'success',
      message: 'Sesi WhatsApp berhasil dimulai',
      data: result,
    };
  }

  @Get('all-sessions')
  @ApiOperation({ summary: 'Mendapatkan daftar semua sesi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Daftar sesi berhasil ditemukan' })
  async getAllSessions() {
    const result = await this.whatsappService.getAllSessions();
    return {
      status: 'success',
      data: result,
    };
  }

  @Get('chats')
  @ApiOperation({ summary: 'Mendapatkan daftar chat WhatsApp' })
  @ApiResponse({ status: 200, description: 'Daftar chat berhasil ditemukan' })
  @ApiResponse({ status: 400, description: 'Gagal mendapatkan daftar chat' })
  async getChats() {
    try {
      const result = await this.whatsappService.getChats();
      
      if (!result) {
        throw new HttpException('Gagal mendapatkan daftar chat', HttpStatus.BAD_REQUEST);
      }
      
      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        `Gagal mendapatkan daftar chat: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('messages/:phone')
  @ApiOperation({ summary: 'Mendapatkan pesan dalam chat' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil ditemukan' })
  @ApiResponse({ status: 400, description: 'Gagal mendapatkan pesan' })
  async getMessages(@Param('phone') phone: string) {
    try {
      const result = await this.whatsappService.getMessagesInChat(phone);
      
      if (!result) {
        throw new HttpException('Gagal mendapatkan pesan', HttpStatus.BAD_REQUEST);
      }
      
      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      throw new HttpException(`Gagal mendapatkan pesan: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('contact/:phone')
  @ApiOperation({ summary: 'Mendapatkan informasi kontak' })
  @ApiResponse({ status: 200, description: 'Kontak berhasil ditemukan' })
  @ApiResponse({ status: 400, description: 'Gagal mendapatkan kontak' })
  async getContact(@Param('phone') phone: string) {
    try {
      const result = await this.whatsappService.getContact(phone);

      if (!result) {
        throw new HttpException('Gagal mendapatkan kontak', HttpStatus.BAD_REQUEST);
      }
      
      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      throw new HttpException(`Gagal mendapatkan kontak: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send')
  @ApiOperation({ summary: 'Mengirim pesan WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim' })
  @ApiResponse({ status: 400, description: 'Gagal mengirim pesan' })
  async sendMessage(@Body() body: { to: string; message: string }) {
    try {
      const result = await this.whatsappService.sendMessage(body.to, body.message);

      if (!result) {
        throw new HttpException('Gagal mengirim pesan', HttpStatus.BAD_REQUEST);
      }
      
      return {
        status: 'success',
        message: 'Pesan berhasil dikirim',
        data: result,
      };
    } catch (error) {
      throw new HttpException(`Gagal mengirim pesan: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-admin')
  @ApiOperation({ summary: 'Kirim pesan ke admin WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim ke admin' })
  @ApiResponse({ status: 500, description: 'Gagal mengirim pesan ke admin' })
  async sendToAdmin(@Body() body: { message: string }) {
    try {
      if (!body || !body.message) {
        throw new HttpException('Pesan diperlukan', HttpStatus.BAD_REQUEST);
      }

      const { message } = body;
      logInfo(this.logger, 'Mengirim pesan ke admin');
      const result = await this.whatsappService.sendToAdmin(message);

      if (!result) {
        throw new HttpException(
          'Gagal mengirim pesan ke admin WhatsApp',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      logInfo(this.logger, 'Pesan berhasil dikirim ke admin');
      return { success: true, message: 'Pesan berhasil dikirim ke admin' };
    } catch (error) {
      return handleError(
        this.logger,
        error,
        'Gagal mengirim pesan ke admin WhatsApp',
        'sendToAdmin',
      );
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Menerima webhook dari WPPConnect untuk pesan masuk' })
  @ApiResponse({ status: 200, description: 'Webhook berhasil diproses' })
  @ApiBody({ 
    description: 'Format webhook yang didukung',
    schema: {
      oneOf: [
        {
          type: 'object',
          example: webhookExample,
          description: 'Format WPPConnect',
        },
        {
          type: 'object',
          example: webhookReplyExample,
          description: 'Format WPPConnect dengan balasan',
        },
        {
          type: 'object',
          example: webhookAlternativeExample,
          description: 'Format Alternatif',
        },
      ],
    },
  })
  async receiveWebhook(@Body() webhookData: any) {
    try {
      this.logger.log(`Menerima webhook data: ${JSON.stringify(webhookData)}`);
      
      // Validasi data webhook
      if (!webhookData) {
        return { status: 'error', message: 'Invalid webhook data' };
      }

      let from = '';
      let body = '';
      let messageData = {};
      let isReply = false;
      let quotedMessage: any = null;
      
      // Format data untuk WPPConnect
      if (webhookData.event === 'onmessage') {
        // Format untuk pesan dari WPPConnect
        from = webhookData.data?.from || '';
        body = webhookData.data?.body || '';
        messageData = webhookData.data || {};
        
        // Periksa apakah ini balasan dari pesan sebelumnya
        if (webhookData.data?.quotedMsg) {
          isReply = true;
          quotedMessage = webhookData.data.quotedMsg as any;
          this.logger.log(
            `Pesan merupakan balasan dari: ${typeof quotedMessage === 'object' && quotedMessage ? quotedMessage.body || 'Tidak ada isi pesan' : 'Tidak ada isi pesan'}`,
          );
        }
      } else if (webhookData.data && webhookData.data.sender) {
        // Format alternatif (untuk API lain)
        from = webhookData.data.sender?.id?.serialized || '';
        body = webhookData.data.body || webhookData.data.content || '';
        messageData = webhookData.data;
        
        // Periksa apakah ini balasan (format alternatif)
        if (webhookData.data.quotedMessageId || webhookData.data.quotedMessage) {
          isReply = true;
          quotedMessage = webhookData.data.quotedMessage || { id: webhookData.data.quotedMessageId };
          this.logger.log(`Pesan merupakan balasan (format alternatif)`);
        }
      } else {
        // Format tidak dikenali
        this.logger.warn(`Format webhook tidak dikenali: ${JSON.stringify(webhookData)}`);
        return { status: 'warning', message: 'Webhook format not recognized' };
      }

      // Tambahkan informasi balasan ke data pesan
      if (isReply) {
        messageData = {
          ...messageData,
          isReply,
          quotedMessage,
        };
      }

      // Proses pesan masuk
      const messageDataObj: WhatsappMessageData = {
        from,
        message: body,
        messageData,
      };

      await this.whatsappService.processIncomingMessage(messageDataObj);
      return { 
        status: 'success', 
        message: 'Webhook processed successfully',
        isReply: isReply
      };
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
      
      // Buat data dummy untuk diproses
      const dummyData = {
        fromMe: false,
        sender: {
          id: {
            serialized: phone,
          },
        },
        body: message,
      };
      
      // Proses pesan seperti pesan masuk biasa
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
      // Nomor tujuan (menggunakan nomor yang diminta)
      const phone = '6285232152313@c.us';
      this.logger.log(`Memulai tes percakapan dengan nomor ${phone}`);

      // Langkah 1: Mengirim menu ke nomor tersebut
      const menuResult = await this.whatsappService.sendMessage(phone, 'menu');
      if (!menuResult) {
        throw new HttpException('Gagal mengirim menu', HttpStatus.BAD_REQUEST);
      }
      this.logger.log(`Menu berhasil dikirim ke ${phone}`);

      // Mendapatkan ID pesan menu yang dikirim untuk referensi balasan
      const menuMessageId = menuResult.id || Date.now().toString();

      // Langkah 2: Tunggu sebentar untuk simulasi jeda
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Langkah 3: Simulasi balasan dengan opsi 1
      // Membuat data dummy untuk balasan dari pengguna
      const replyData = {
        event: 'onmessage',
        data: {
          from: phone,
          body: '1',
          fromMe: true, // Menandakan ini dari nomor yang sama (simulasi self-reply)
          type: 'chat',
          quotedMsg: {
            type: 'chat',
            body: 'menu',
            from: phone,
            id: menuMessageId,
          },
        },
      };

      // Proses simulasi balasan
      await this.receiveWebhook(replyData);

      return {
        status: 'success',
        message: `Simulasi percakapan berhasil diproses untuk nomor ${phone}`,
        steps: [
          'Mengirim menu ke nomor target',
          'Simulasi pengguna membalas dengan opsi 1',
          'Melihat respons dari sistem terhadap balasan'
        ]
      };
    } catch (error) {
      this.logger.error(`Gagal mengeksekusi tes percakapan: ${error.message}`);
      throw new HttpException(`Gagal mengeksekusi tes percakapan: ${error.message}`, HttpStatus.BAD_REQUEST);
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

      // Format nomor telepon
      let formattedPhone = phone;
      if (!phone.includes('@c.us')) {
        formattedPhone = `${phone.replace(/^0/, '62')}@c.us`;
      }

      this.logger.log(`Mengirim menu langsung ke ${formattedPhone}`);

      // Dapatkan template menu dari helper
      const menuText = `🏍️ *ROSANTIBIKE MOTORRENT* 🏍️\n\n` +
        `Silakan pilih menu berikut:\n` +
        `1️⃣ Cek Daftar Motor\n` +
        `2️⃣ Cek Harga Sewa\n` +
        `3️⃣ Info Pemesanan\n` +
        `4️⃣ Status Transaksi\n` +
        `5️⃣ Bantuan\n\n` +
        `Balas dengan nomor menu yang diinginkan.`;
      
      // Kirim menu langsung
      const result = await this.whatsappService.sendMessage(formattedPhone, menuText);

      if (!result) {
        throw new HttpException('Gagal mengirim menu', HttpStatus.BAD_REQUEST);
      }

      return {
        status: 'success',
        message: `Menu berhasil dikirim ke ${formattedPhone}`,
        data: result
      };
    } catch (error) {
      this.logger.error(`Gagal mengirim menu langsung: ${error.message}`);
      throw new HttpException(`Gagal mengirim menu langsung: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }
}
