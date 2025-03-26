import { Controller, Post, Body, Get, HttpStatus, HttpException } from '@nestjs/common';
import { WhatsappService } from '../services/whatsapp.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import logger from 'baileys/lib/Utils/logger';

interface SendMessageDto {
  to: string;
  message: string;
}

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send')
  @ApiOperation({ summary: 'Kirim pesan WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim' })
  @ApiResponse({ status: 500, description: 'Gagal mengirim pesan' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    if (!sendMessageDto) {
      throw new HttpException('Data yang diperlukan tidak lengkap', HttpStatus.BAD_REQUEST);
    }

    const { to, message } = sendMessageDto;

    if (!to || !message) {
      throw new HttpException('Nomor tujuan dan pesan diperlukan', HttpStatus.BAD_REQUEST);
    }

    const result = await this.whatsappService.sendMessage(to, message);

    if (!result) {
      throw new HttpException('Gagal mengirim pesan WhatsApp', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true, message: 'Pesan berhasil dikirim' };
  }

  @Post('send-admin')
  @ApiOperation({ summary: 'Kirim pesan ke admin WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim ke admin' })
  @ApiResponse({ status: 500, description: 'Gagal mengirim pesan ke admin' })
  async sendToAdmin(@Body() body: { message: string }) {
    if (!body || !body.message) {
      throw new HttpException('Pesan diperlukan', HttpStatus.BAD_REQUEST);
    }

    const { message } = body;
    const result = await this.whatsappService.sendToAdmin(message);

    if (!result) {
      throw new HttpException(
        'Gagal mengirim pesan ke admin WhatsApp',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { success: true, message: 'Pesan berhasil dikirim ke admin' };
  }

  @Post('reset-connection')
  @ApiOperation({ summary: 'Reset koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Koneksi WhatsApp berhasil di-reset' })
  async resetConnection() {
    await this.whatsappService.resetConnection();
    return { success: true, message: 'Koneksi WhatsApp berhasil di-reset' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Cek status koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Status koneksi WhatsApp' })
  async getStatus() {
    const status = await this.whatsappService.getConnectionStatus();
    const reconnecting = status.status === 'reconnecting';
    const connected = status.status === 'connected';
    const authenticating = status.status === 'authenticated';

    let statusMessage = '';

    if (reconnecting) {
      statusMessage = `Sedang mencoba menyambungkan kembali (Percobaan ${status.retryCount}/${this.whatsappService.maxRetries})`;
    } else if (connected) {
      logger.info('WhatsApp terhubung');
    } else if (authenticating) {
      logger.info('Proses autentikasi sedang berlangsung, harap tunggu...');
    } else if (status.status === 'connecting') {
      logger.info('Sedang mencoba terhubung ke WhatsApp...');
    } else if (status.status === 'error') {
      logger.error('Terjadi kesalahan koneksi WhatsApp, silakan reset koneksi');
    } else {
      logger.info('WhatsApp tidak terhubung, silakan scan QR code');
    }

    return {
      status,
      isReconnecting: reconnecting,
      isConnected: connected,
      isAuthenticating: authenticating,
      message: statusMessage,
    };
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Dapatkan QR code terakhir untuk koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'QR code terakhir' })
  @ApiResponse({ status: 404, description: 'QR code tidak tersedia' })
  async getQrCode() {
    const qrCode = await this.whatsappService.getLastQrCode();

    if (!qrCode) {
      throw new HttpException(
        'QR code belum tersedia, silakan reset koneksi',
        HttpStatus.NOT_FOUND,
      );
    }

    return { qrCode };
  }
}
