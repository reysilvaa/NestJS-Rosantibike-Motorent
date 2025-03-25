import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

// Enum menggunakan literal string yang sesuai dengan schema.prisma
export type StatusMotor = 'TERSEDIA' | 'DISEWA' | 'DIPESAN' | 'OVERDUE';
export type StatusTransaksi = 'AKTIF' | 'SELESAI' | 'OVERDUE';
export type StatusArtikel = 'DRAFT' | 'TERBIT';

// Nilai enum yang bisa digunakan
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

// Interface untuk Admin
export type AdminType = {
  id: string;
  username: string;
  nama: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

// Interface untuk Jenis Motor
export type JenisMotorType = {
  id: string;
  merk: string;
  model: string;
  cc: number;
  createdAt?: Date;
  updatedAt?: Date;
};

// Interface untuk Unit Motor
export type UnitMotorType = {
  id: string;
  jenisId: string;
  platNomor: string;
  hargaSewa: Decimal;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Interface untuk Transaksi
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

// Interface untuk Blog Tag
export type BlogTagType = {
  id: string;
  nama: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Interface untuk Blog Post
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
