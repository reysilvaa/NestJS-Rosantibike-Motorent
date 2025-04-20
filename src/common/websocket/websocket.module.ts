import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * WebsocketModule - Menyediakan fitur komunikasi real-time menggunakan Socket.IO
 *
 * Modul ini mengelola koneksi websocket untuk notifikasi real-time,
 * pembaruan status, chat, dan fitur real-time lainnya dalam aplikasi.
 */
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}
