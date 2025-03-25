import { Controller, Post, Body, Get, HttpStatus, HttpException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
    const { to, message } = sendMessageDto;
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
  async sendToAdmin(@Body() { message }: { message: string }) {
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
    return { status };
  }
}
