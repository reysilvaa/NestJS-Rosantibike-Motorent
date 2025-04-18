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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { handleError, logInfo } from '../../../common/helpers';

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
      throw new HttpException('QR code tidak tersedia. Mungkin sudah terhubung atau belum siap.', HttpStatus.NOT_FOUND);
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
      throw new HttpException(
        `Gagal mendapatkan pesan: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
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
      throw new HttpException(
        `Gagal mendapatkan kontak: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('send')
  @ApiOperation({ summary: 'Mengirim pesan WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim' })
  @ApiResponse({ status: 400, description: 'Gagal mengirim pesan' })
  async sendMessage(
    @Body() body: { to: string; message: string },
  ) {
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
      throw new HttpException(
        `Gagal mengirim pesan: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
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
  async receiveWebhook(@Body() webhookData: any) {
    try {
      this.logger.log(`Menerima webhook data: ${JSON.stringify(webhookData)}`);
      
      // Validasi data webhook
      if (!webhookData || !webhookData.event) {
        return { status: 'error', message: 'Invalid webhook data' };
      }
      
      // Proses pesan masuk
      if (webhookData.event === 'onmessage') {
        const messageData = webhookData.data;
        
        // Pastikan ini adalah pesan chat teks (bukan status, dll)
        if (messageData && messageData.type === 'chat' && !messageData.fromMe) {
          await this.whatsappService.processIncomingMessage(
            messageData.from,
            messageData.body || '',
            messageData
          );
        }
      }
      
      return { status: 'success', message: 'Webhook processed' };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      return { status: 'error', message: error.message };
    }
  }

  @Post('test-menu')
  @ApiOperation({ summary: 'Tes menu WhatsApp bot' })
  @ApiResponse({ status: 200, description: 'Tes pesan berhasil diproses' })
  async testMenu(@Body() body: { phone: string; message: string }) {
    try {
      if (!body.phone || !body.message) {
        throw new HttpException('Nomor telepon dan pesan diperlukan', HttpStatus.BAD_REQUEST);
      }
      
      // Format nomor WhatsApp
      const phoneNumber = body.phone.startsWith('+') 
        ? body.phone.slice(1) 
        : body.phone;
      
      const from = `${phoneNumber}@s.whatsapp.net`;
      
      // Proses pesan
      await this.whatsappService.processIncomingMessage(
        from,
        body.message,
        { type: 'chat', fromMe: false, body: body.message }
      );
      
      return {
        status: 'success',
        message: 'Pesan berhasil diproses',
      };
    } catch (error) {
      this.logger.error(`Error testing menu: ${error.message}`, error.stack);
      throw new HttpException(`Gagal memproses tes menu: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }
}
