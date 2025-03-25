import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  allowEIO3: true,
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationGateway');

  afterInit(_server: Server) {
    this.logger.log('Notification gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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

  // Handler untuk event test dari client
  @SubscribeMessage('test-new-transaction')
  handleTestNewTransaction(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} sent test new transaction with data: ${JSON.stringify(data)}`);
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
    this.logger.log(`Client ${client.id} sent test motor status with data: ${JSON.stringify(data)}`);
    this.server.emit('motor-status-update', data);
    return { status: 'ok', message: 'Test notifikasi status motor berhasil dikirim' };
  }
}
