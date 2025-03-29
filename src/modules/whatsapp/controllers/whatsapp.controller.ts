import { Controller, Post, Body, Get, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { WhatsappService } from '../services/whatsapp.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import logger from 'baileys/lib/Utils/logger';
import { handleError, logInfo } from '../../../common/helpers';

interface SendMessageDto {
  to: string;
  message: string;
}

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send')
  @ApiOperation({ summary: 'Kirim pesan WhatsApp' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dikirim' })
  @ApiResponse({ status: 500, description: 'Gagal mengirim pesan' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    try {
      if (!sendMessageDto) {
        throw new HttpException('Data yang diperlukan tidak lengkap', HttpStatus.BAD_REQUEST);
      }

      const { to, message } = sendMessageDto;

      if (!to || !message) {
        throw new HttpException('Nomor tujuan dan pesan diperlukan', HttpStatus.BAD_REQUEST);
      }

      logInfo(this.logger, `Mengirim pesan ke nomor: ${to}`);
      const result = await this.whatsappService.sendMessage(to, message);

      if (!result) {
        throw new HttpException('Gagal mengirim pesan WhatsApp', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logInfo(this.logger, 'Pesan berhasil dikirim');
      return { success: true, message: 'Pesan berhasil dikirim' };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengirim pesan WhatsApp', 'sendMessage');
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

  @Post('reset-connection')
  @ApiOperation({ summary: 'Reset koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Koneksi WhatsApp berhasil di-reset' })
  async resetConnection() {
    try {
      logInfo(this.logger, 'Melakukan reset koneksi WhatsApp');
      await this.whatsappService.resetConnection();
      logInfo(this.logger, 'Koneksi WhatsApp berhasil di-reset');
      return { success: true, message: 'Koneksi WhatsApp berhasil di-reset' };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal reset koneksi WhatsApp', 'resetConnection');
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Cek status koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'Status koneksi WhatsApp' })
  async getStatus() {
    try {
      logInfo(this.logger, 'Mengecek status koneksi WhatsApp');
      const status = await this.whatsappService.getConnectionStatus();
      const reconnecting = status.status === 'reconnecting';
      const connected = status.status === 'connected';
      const authenticating = status.status === 'authenticated';

      let statusMessage = '';

      if (reconnecting) {
        statusMessage = `Sedang mencoba menyambungkan kembali (Percobaan ${status.retryCount}/${this.whatsappService.maxRetries})`;
      } else if (connected) {
        statusMessage = 'WhatsApp terhubung';
      } else if (authenticating) {
        statusMessage = 'Proses autentikasi sedang berlangsung, harap tunggu...';
      } else if (status.status === 'connecting') {
        statusMessage = 'Sedang mencoba terhubung ke WhatsApp...';
      } else if (status.status === 'error') {
        statusMessage = 'Terjadi kesalahan koneksi WhatsApp, silakan reset koneksi';
      } else {
        statusMessage = 'WhatsApp tidak terhubung, silakan scan QR code';
      }

      logInfo(this.logger, `Status koneksi WhatsApp: ${status.status}`);

      return {
        status,
        isReconnecting: reconnecting,
        isConnected: connected,
        isAuthenticating: authenticating,
        message: statusMessage,
      };
    } catch (error) {
      return handleError(
        this.logger,
        error,
        'Gagal mendapatkan status koneksi WhatsApp',
        'getStatus',
      );
    }
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Dapatkan QR code terakhir untuk koneksi WhatsApp' })
  @ApiResponse({ status: 200, description: 'QR code terakhir' })
  @ApiResponse({ status: 404, description: 'QR code tidak tersedia' })
  async getQrCode() {
    try {
      logInfo(this.logger, 'Mengambil QR code WhatsApp terakhir');
      const qrCode = await this.whatsappService.getLastQrCode();

      if (!qrCode) {
        throw new HttpException(
          'QR code belum tersedia, silakan reset koneksi',
          HttpStatus.NOT_FOUND,
        );
      }

      logInfo(this.logger, 'QR code berhasil diambil');
      return { qrCode };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mendapatkan QR code WhatsApp', 'getQrCode');
    }
  }
}
