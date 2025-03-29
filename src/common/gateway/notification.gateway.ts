import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
  },
  transports: ['polling', 'websocket'],
  path: '/socket.io/',
  allowEIO3: true,
  pingTimeout: 60_000,
  pingInterval: 25_000,
  connectTimeout: 10_000,
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationGateway');

  afterInit(server: Server) {
    this.logger.log('Notification gateway initialized');

    // Handle server-level events
    server.on('error', err => {
      this.logger.error(`Socket.io server error: ${err.message}`, err.stack);
    });

    // Log transport changes
    server.engine.on('connection_error', err => {
      this.logger.error(`Socket.io connection_error: ${err.message}`, err.stack);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Monitor for client errors
    client.on('error', error => {
      this.logger.error(`Client ${client.id} error: ${error.message}`);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    void client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string) {
    void client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
  }

  // Event untuk notifikasi transaksi baru
  sendNewTransactionNotification(data: any) {
    this.server.emit('new-transaction', data);
  }

  // Event untuk notifikasi transaksi overdue
  sendOverdueNotification(data: any) {
    this.server.emit('overdue-transaction', data);
  }

  // Event untuk notifikasi status motor berubah
  sendMotorStatusNotification(data: any) {
    this.server.emit('motor-status-update', data);
  }

  // Event untuk notifikasi denda
  sendDendaNotification(data: any) {
    this.server.emit('denda-notification', data);
  }

  // Event untuk notifikasi fasilitas
  sendFasilitasNotification(data: any) {
    this.server.emit('fasilitas-notification', data);
  }

  // Handler untuk event test dari client
  @SubscribeMessage('test-new-transaction')
  handleTestNewTransaction(client: Socket, data: any) {
    this.logger.log(
      `Client ${client.id} sent test new transaction with data: ${JSON.stringify(data)}`,
    );
    this.server.emit('new-transaction', data);
    return { status: 'ok', message: 'Test notifikasi transaksi baru berhasil dikirim' };
  }

  @SubscribeMessage('test-overdue')
  handleTestOverdue(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} sent test overdue with data: ${JSON.stringify(data)}`);
    this.server.emit('overdue-transaction', data);
    return { status: 'ok', message: 'Test notifikasi overdue berhasil dikirim' };
  }

  @SubscribeMessage('test-motor-status')
  handleTestMotorStatus(client: Socket, data: any) {
    this.logger.log(
      `Client ${client.id} sent test motor status with data: ${JSON.stringify(data)}`,
    );
    this.server.emit('motor-status-update', data);
    return { status: 'ok', message: 'Test notifikasi status motor berhasil dikirim' };
  }

  @SubscribeMessage('test-denda')
  handleTestDenda(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} sent test denda with data: ${JSON.stringify(data)}`);
    this.server.emit('denda-notification', data);
    return { status: 'ok', message: 'Test notifikasi denda berhasil dikirim' };
  }

  @SubscribeMessage('test-fasilitas')
  handleTestFasilitas(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} sent test fasilitas with data: ${JSON.stringify(data)}`);
    this.server.emit('fasilitas-notification', data);
    return { status: 'ok', message: 'Test notifikasi fasilitas berhasil dikirim' };
  }
}
