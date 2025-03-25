import { Injectable } from '@nestjs/common';
import {
  PrismaService,
  AdminType,
  StatusMotor,
  StatusTransaksi as _StatusTransaksi,
  StatusArtikel as _StatusArtikel,
} from './prisma.service';

/**
 * Mock Prisma Service untuk testing
 * Service ini meng-extend PrismaService asli tapi meng-override metode-metode yang diperlukan
 * untuk mengisolasi pengujian dari database yang sebenarnya
 *
 * @description Service ini memberikan data dummy untuk digunakan dalam pengujian
 */
@Injectable()
export class PrismaMockService extends PrismaService {
  // Override connect dan disconnect methods untuk testing
  async $connect(): Promise<void> {
    // No-op untuk testing
    return;
  }

  async $disconnect(): Promise<void> {
    // No-op untuk testing
    return;
  }

  // Override other models as needed
}
