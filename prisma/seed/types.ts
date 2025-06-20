import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';


export type StatusMotor = 'TERSEDIA' | 'DISEWA' | 'DIPESAN' | 'OVERDUE';
export type StatusTransaksi = 'AKTIF' | 'SELESAI' | 'OVERDUE';
export type StatusArtikel = 'DRAFT' | 'TERBIT';


export const StatusMotor = {
  TERSEDIA: 'TERSEDIA' as StatusMotor,
  DISEWA: 'DISEWA' as StatusMotor,
  DIPESAN: 'DIPESAN' as StatusMotor,
  OVERDUE: 'OVERDUE' as StatusMotor,
};

export const StatusTransaksi = {
  AKTIF: 'AKTIF' as StatusTransaksi,
  SELESAI: 'SELESAI' as StatusTransaksi,
  OVERDUE: 'OVERDUE' as StatusTransaksi,
};

export const StatusArtikel = {
  DRAFT: 'DRAFT' as StatusArtikel,
  TERBIT: 'TERBIT' as StatusArtikel,
};


export type AdminType = {
  id: string;
  username: string;
  nama: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};


export interface JenisMotorType {
  id: string;
  merk: string;
  model: string;
  cc: number;
  slug: string;
  gambar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}


export interface UnitMotorType {
  id: string;
  jenisId: string;
  platNomor: string;
  slug: string;
  status: string;
  hargaSewa: any; 
  tahunPembuatan?: number;
  createdAt: Date;
  updatedAt: Date;
}


export type TransaksiType = {
  id: string;
  namaPenyewa: string;
  noWhatsapp: string;
  unitId: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: string;
  totalBiaya: Decimal;
  createdAt?: Date;
  updatedAt?: Date;
};


export type BlogTagType = {
  id: string;
  nama: string;
  createdAt?: Date;
  updatedAt?: Date;
};


export type BlogPostType = {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  thumbnail?: string | null;
  kategori: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};
