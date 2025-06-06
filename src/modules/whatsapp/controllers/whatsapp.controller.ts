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

      // Validasi data webhook
      if (!webhookData) {
        this.logger.warn('Invalid webhook data: null or undefined');
        return { status: 'error', message: 'Invalid webhook data' };
      }

      // Tangani berbagai event yang mungkin dikirim oleh WPPConnect
      const event = webhookData.event || 'unknown';
      this.logger.log(`Jenis event webhook: ${event}`);

      // Tangani event berdasarkan jenisnya
      switch (event) {
        case 'onmessage': {
          let from = '';
          let body = '';
          let messageData = {};
          let isReply = false;
          let quotedMessage: any = null;

          // Format data untuk WPPConnect
          if (webhookData.event === 'onmessage') {
            // Format baru WPPConnect - periksa berbagai format yang mungkin
            from = webhookData.data?.from || webhookData.from || webhookData.sender?.id || '';
            body = webhookData.data?.body || webhookData.body || webhookData.content || '';

            // Format data JSON untuk pemrosesan - gunakan struktur asli sebagai fallback
            messageData = webhookData.data || webhookData;

            this.logger.log(`Extracted message info: from=${from}, body=${body}`);

            // Periksa apakah ini balasan dari pesan sebelumnya
            if (webhookData.data?.quotedMsg || webhookData.quotedMsg) {
              isReply = true;
              quotedMessage = webhookData.data?.quotedMsg || webhookData.quotedMsg;
              this.logger.log(
                `Pesan merupakan balasan dari: ${typeof quotedMessage === 'object' && quotedMessage ? quotedMessage.body || 'Tidak ada isi pesan' : 'Tidak ada isi pesan'}`,
              );
            }
          } else if (webhookData.data && webhookData.data.sender) {
            // Format alternatif (untuk API lain)
            from = webhookData.data.sender?.id?.serialized || webhookData.data.sender?.id || '';
            body = webhookData.data.body || webhookData.data.content || '';
            messageData = webhookData.data;

            // Periksa apakah ini balasan (format alternatif)
            if (webhookData.data.quotedMessageId || webhookData.data.quotedMessage) {
              isReply = true;
              quotedMessage = webhookData.data.quotedMessage || {
                id: webhookData.data.quotedMessageId,
              };
              this.logger.log(`Pesan merupakan balasan (format alternatif)`);
            }
          } else {
            // Format tidak dikenali - coba format standar WPP Connect versi terbaru
            from = webhookData.from || '';
            body = webhookData.body || '';
            messageData = webhookData;

            if (from && body) {
              this.logger.log(
                `Detected possible WPP Connect v2 format. Using from=${from}, body=${body}`,
              );
            } else {
              // Format tidak dikenali
              this.logger.warn(`Format webhook tidak dikenali: ${JSON.stringify(webhookData)}`);
              return { status: 'warning', message: 'Webhook format not recognized' };
            }
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

          // Tambahan validasi untuk memastikan data valid
          if (!from || !body) {
            this.logger.warn('Invalid message data: missing from or body');
            return {
              status: 'error',
              message: 'Missing required message data (from or body field)',
            };
          }

          // Tambahkan debug log untuk melihat data yang akan diproses
          this.logger.log(`Processing incoming message: from=${from}, body=${body}`);

          // Beri respons webhook segera untuk mencegah timeout
          // Kemudian proses pesan secara asinkron
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
          // Acknowledgement terhadap pesan yang dikirim
          this.logger.log(`Received ACK notification: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'ACK notification received' };
        }

        case 'onpresencechanged': {
          // Perubahan status online/offline
          this.logger.log(`Presence changed: ${JSON.stringify(webhookData.data || webhookData)}`);
          // Jangan proses notifikasi presence sebagai pesan
          return { status: 'success', message: 'Presence change notification received' };
        }

        case 'onparticipantschanged': {
          // Perubahan peserta dalam grup
          this.logger.log(`Group participants changed: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Group participants change notification received' };
        }

        case 'onreactionmessage': {
          // Reaksi terhadap pesan
          this.logger.log(`Message reaction: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Message reaction notification received' };
        }

        case 'onpollresponse': {
          // Tanggapan terhadap polling
          this.logger.log(`Poll response: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Poll response notification received' };
        }

        case 'onrevokedmessage': {
          // Pesan yang ditarik kembali
          this.logger.log(`Message revoked: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Message revoke notification received' };
        }

        case 'onlabelupdated': {
          // Label yang diperbarui
          this.logger.log(`Label updated: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Label update notification received' };
        }

        case 'onselfmessage': {
          // Pesan dari diri sendiri
          this.logger.log(`Self message: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Self message notification received' };
        }

        case 'incomingcall': {
          // Panggilan masuk
          this.logger.log(`Incoming call: ${JSON.stringify(webhookData.data)}`);
          return { status: 'success', message: 'Incoming call notification received' };
        }

        default: {
          // Event lain yang belum ditangani khusus
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

      // Format nomor telepon
      let formattedPhone = phone;
      if (!phone.includes('@c.us')) {
        formattedPhone = `${phone.replace(/^0/, '62')}@c.us`;
      }

      this.logger.log(`Mengirim menu langsung ke ${formattedPhone}`);

      // Dapatkan template menu dari helper
      const menuText =
        `🏍️ *ROSANTIBIKE MOTORRENT* 🏍️\n\n` +
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
