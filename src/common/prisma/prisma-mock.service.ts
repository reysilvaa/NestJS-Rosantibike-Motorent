import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaMockService extends PrismaService {
  async $connect(): Promise<void> {
    return;
  }

  async $disconnect(): Promise<void> {
    return;
  }
}
