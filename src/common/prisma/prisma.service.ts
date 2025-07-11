import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma as _Prisma } from '@prisma/client';
import { createWinstonLogger } from '../config/logger.config';

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

export interface AdminType {
  id: string;
  username: string;
  password: string;
  nama: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createWinstonLogger('PrismaService');

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

    (this as any).$on('query', (e: any) => {
      if (this.logger.debug) {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  $transaction = super.$transaction;

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
