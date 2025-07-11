import { TransaksiStatus, TransaksiStatusType } from './enum';
import { UnitMotor } from './jenis-motor';

export interface TransaksiSewa {
  id: string;
  namaPenyewa: string;
  noWhatsapp: string;
  unitId: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: TransaksiStatusType;
  totalBiaya: number;
  createdAt: Date;
  updatedAt: Date;
  biayaDenda: number;
  helm: number;
  jamMulai: string;
  jamSelesai: string;
  jasHujan: number;
  unitMotor?: UnitMotor;
}

export interface CreateTransaksiDto {
  namaPenyewa: string;
  noWhatsapp: string;
  unitId: string;
  tanggalMulai: Date | string;
  tanggalSelesai: Date | string;
  jamMulai?: string;
  jamSelesai?: string;
  helm?: number;
  jasHujan?: number;
}

export interface UpdateTransaksiDto {
  namaPenyewa?: string;
  noWhatsapp?: string;
  unitId?: string;
  tanggalMulai?: Date | string;
  tanggalSelesai?: Date | string;
  status?: TransaksiStatusType;
  totalBiaya?: number;
  biayaDenda?: number;
  helm?: number;
  jamMulai?: string;
  jamSelesai?: string;
  jasHujan?: number;
}

export interface FilterTransaksiDto {
  search?: string;
  namaPenyewa?: string;
  noWhatsapp?: string;
  unitId?: string;
  status?: TransaksiStatusType[];
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export interface CalculatePriceDto {
  unitId: string;
  tanggalMulai: Date | string;
  tanggalSelesai: Date | string;
  jamMulai?: string;
  jamSelesai?: string;
  helm?: number;
  jasHujan?: number;
}
