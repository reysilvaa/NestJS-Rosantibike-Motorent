import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  ValidateIf,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { StatusTransaksi } from '../../../common/enums/status.enum';

export class CreateTransaksiDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama penyewa tidak boleh kosong' })
  namaPenyewa: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp tidak boleh kosong' })
  noWhatsapp: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Unit motor harus dipilih' })
  unitId: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal mulai sewa harus diisi' })
  tanggalMulai: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal selesai sewa harus diisi' })
  tanggalSelesai: string;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @ValidateIf((o) => o.totalBiaya !== undefined)
  totalBiaya?: number;
}

export class UpdateTransaksiDto {
  @IsString()
  @IsOptional()
  namaPenyewa?: string;

  @IsString()
  @IsOptional()
  noWhatsapp?: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @IsDateString()
  @IsOptional()
  tanggalMulai?: string;

  @IsDateString()
  @IsOptional()
  tanggalSelesai?: string;

  @IsEnum(StatusTransaksi)
  @IsOptional()
  status?: StatusTransaksi;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  totalBiaya?: number;
}

export class FilterTransaksiDto {
  @IsString()
  @IsOptional()
  search?: string; // Untuk mencari nama penyewa atau nomor WhatsApp

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map((status) => status.trim());
    }
    return value;
  })
  status?: StatusTransaksi | StatusTransaksi[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit: number = 10;
}
