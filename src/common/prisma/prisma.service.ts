import { Injectable } from '@nestjs/common';

// Dummy enums to use while Prisma is broken
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
export class PrismaService {
  // Dummy methods to avoid errors
  async $connect() {
    console.log('Mock connect called');
  }

  async $disconnect() {
    console.log('Mock disconnect called');
  }

  // Mock models with proper parameter handling
  unitMotor = {
    findUnique: async (params: any) => ({ 
      id: 'mock-id', 
      platNomor: 'AB1234XY',
      status: StatusMotor.TERSEDIA,
      hargaSewa: 100000,
      jenisId: 'jenis-id',
      unitId: 'unit-id'
    }),
    findMany: async (params: any) => [],
    count: async (params: any) => 0,
    create: async (params: any) => ({}),
    update: async (params: any) => ({}),
    delete: async (params: any) => ({}),
  };

  transaksiSewa = {
    findUnique: async (params: any) => ({
      id: 'mock-id',
      namaPenyewa: 'Test User',
      noWhatsapp: '6281234567890',
      unitId: 'unit-id',
      tanggalMulai: new Date(),
      tanggalSelesai: new Date(),
      status: StatusTransaksi.AKTIF,
      totalBiaya: 200000,
      unitMotor: {
        id: 'unit-id',
        platNomor: 'AB1234XY',
        status: StatusMotor.DISEWA,
        hargaSewa: 100000,
        jenis: {
          id: 'jenis-id',
          merk: 'Honda',
          model: 'Vario',
          cc: 125
        }
      }
    }),
    findMany: async (params: any) => [],
    findFirst: async (params: any) => ({
      id: 'mock-id',
      namaPenyewa: 'Test User',
      noWhatsapp: '6281234567890',
      unitId: 'unit-id',
      tanggalMulai: new Date(),
      tanggalSelesai: new Date(),
      status: StatusTransaksi.AKTIF,
      totalBiaya: 200000
    }),
    count: async (params: any) => 0,
    create: async (params: any) => ({}),
    update: async (params: any) => ({}),
    delete: async (params: any) => ({}),
  };

  jenisMotor = {
    findUnique: async (params: any) => ({
      id: 'jenis-id',
      merk: 'Honda',
      model: 'Vario',
      cc: 125
    }),
    findMany: async (params: any) => [],
    count: async (params: any) => 0,
    create: async (params: any) => ({}),
    update: async (params: any) => ({}),
    delete: async (params: any) => ({}),
  };

  blogPost = {
    findUnique: async (params: any) => ({
      id: 'post-id',
      judul: 'Test Blog',
      slug: 'test-blog',
      konten: 'Test Content',
      status: StatusArtikel.TERBIT
    }),
    findMany: async (params: any) => [],
    count: async (params: any) => 0,
    create: async (params: any) => ({}),
    update: async (params: any) => ({}),
    delete: async (params: any) => ({}),
  };

  blogTag = {
    findUnique: async (params: any) => ({}),
    findMany: async (params: any) => [],
    count: async (params: any) => 0,
    create: async (params: any) => ({}),
    update: async (params: any) => ({}),
    delete: async (params: any) => ({}),
  };

  blogPostTag = {
    create: async (params: any) => ({}),
    deleteMany: async (params: any) => ({}),
  };

  admin = {
    findUnique: async (params: { where: { username: string } }): Promise<AdminType> => ({ 
      id: 'mock-id', 
      username: 'admin', 
      password: 'hashed-password',
      nama: 'Admin'
    }),
    create: async (params: { data: { password: string; username: string; nama: string } }): Promise<AdminType> => ({ 
      id: 'mock-id', 
      username: 'admin', 
      password: 'hashed-password',
      nama: 'Admin' 
    }),
    update: async (params: { where: { id: string }; data: any }): Promise<AdminType> => ({ 
      id: 'mock-id', 
      username: 'admin', 
      password: 'hashed-password',
      nama: 'Admin'
    }),
    delete: async (params: { where: { id: string } }): Promise<AdminType> => ({ 
      id: 'mock-id', 
      username: 'admin', 
      password: 'hashed-password',
      nama: 'Admin'
    }),
  };

  // Mock transaction
  async $transaction(callback: any) {
    return callback(this);
  }
}
