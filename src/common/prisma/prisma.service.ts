import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { Prisma as _Prisma } from '@prisma/client';

/**
 * Enum status motor yang tersedia dalam sistem
 * Digunakan untuk tracking kondisi unit motor
 */
export enum StatusMotor {
  TERSEDIA = 'TERSEDIA',
  DISEWA = 'DISEWA',
  DIPESAN = 'DIPESAN',
  OVERDUE = 'OVERDUE',
  PERBAIKAN = 'PERBAIKAN',
}

export enum StatusTransaksi {
  AKTIF = 'AKTIF',
  SELESAI = 'SELESAI',
  OVERDUE = 'OVERDUE',
  PENDING = 'PENDING',
  DIBATALKAN = 'DIBATALKAN',
}

export enum StatusArtikel {
  DRAFT = 'DRAFT',
  TERBIT = 'TERBIT',
  ARSIP = 'ARSIP',
}

// Mock data types
export interface TransaksiWithRelations {
  id: string;
  namaPenyewa: string;
  noWhatsapp: string;
  unitId: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: StatusTransaksi;
  totalBiaya: number;
  unitMotor: {
    id: string;
    platNomor: string;
    status: StatusMotor;
    hargaSewa: number;
    jenis: {
      id: string;
      merk: string;
      model: string;
      cc: number;
    };
  };
}

// Mock admin type
export interface AdminType {
  id: string;
  username: string;
  password: string;
  nama: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Connected to database');

    // Debugging event for query
    (this as any).$on('query', (e: any) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Params: ${e.params}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  // Override transaction untuk testing
  $transaction = super.$transaction;

  // Override model methods
  get unitMotor() {
    return super.unitMotor;
  }

  get transaksiSewa() {
    return super.transaksiSewa;
  }

  get jenisMotor() {
    return super.jenisMotor;
  }

  get blogPost() {
    return super.blogPost;
  }

  get blogTag() {
    return super.blogTag;
  }

  get blogPostTag() {
    return super.blogPostTag;
  }

  get admin() {
    return super.admin;
  }
}
