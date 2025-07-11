import { MotorStatus, MotorStatusType } from './enum';
import { JenisMotor } from './jenis-motor';

export interface UnitMotor {
  id: string;
  jenisId: string;
  platNomor: string;
  slug: string;
  status: MotorStatusType;
  hargaSewa: number;
  tahunPembuatan: number;
  createdAt: Date;
  updatedAt: Date;
  jenis?: JenisMotor;
}

export interface CreateUnitMotorDto {
  jenisId: string;
  platNomor: string;
  hargaSewa: number;
  tahunPembuatan?: number;
  status?: MotorStatusType;
}

export interface UpdateUnitMotorDto {
  jenisId?: string;
  platNomor?: string;
  status?: MotorStatusType;
  hargaSewa?: number;
  tahunPembuatan?: number;
}

export interface FilterUnitMotorDto {
  search?: string;
  jenisId?: string;
  merk?: string;
  model?: string;
  status?: MotorStatusType;
  minHarga?: number;
  maxHarga?: number;
  tahunPembuatan?: number;
  page?: number;
  limit?: number;
}

export interface CheckAvailabilityDto {
  startDate: string;
  endDate: string;
  jenisId?: string;
  unitId?: string;
}
