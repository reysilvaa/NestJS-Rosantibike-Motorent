export interface JenisMotor {
  id: string;
  merk: string;
  model: string;
  slug: string;
  cc: number;
  gambar?: string | null;
  createdAt: Date;
  updatedAt: Date;
  unitMotor?: UnitMotor[];
}

export interface UnitMotor {
  id: string;
  jenisId: string;
  platNomor: string;
  slug: string;
  status: string;
  hargaSewa: number;
  tahunPembuatan: number;
  createdAt: Date;
  updatedAt: Date;
  jenis?: JenisMotor;
}

export interface CreateJenisMotorDto {
  merk: string;
  model: string;
  cc: number;
  gambar?: string;
}

export interface UpdateJenisMotorDto {
  merk?: string;
  model?: string;
  cc?: number;
  gambar?: string;
}

export interface FilterJenisMotorDto {
  search?: string;
  merk?: string;
  model?: string;
  cc?: number;
  page?: number;
  limit?: number;
}
