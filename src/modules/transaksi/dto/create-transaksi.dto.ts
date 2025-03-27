import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  ValidateIf,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { 
    message: 'Format jam mulai tidak valid. Gunakan format HH:MM (contoh: 08:00)' 
  })
  @IsNotEmpty({ message: 'Jam mulai sewa harus diisi' })
  jamMulai: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { 
    message: 'Format jam selesai tidak valid. Gunakan format HH:MM (contoh: 08:00)' 
  })
  @IsNotEmpty({ message: 'Jam selesai sewa harus diisi' })
  jamSelesai: string;

  @IsNumber()
  @Min(0, { message: 'Jumlah jas hujan harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 jas hujan' })
  @Transform(({ value }) => parseInt(value))
  @ValidateIf(o => o.jasHujan !== undefined)
  jasHujan?: number = 0;

  @IsNumber()
  @Min(0, { message: 'Jumlah helm harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 helm' })
  @Transform(({ value }) => parseInt(value))
  @ValidateIf(o => o.helm !== undefined)
  helm?: number = 0;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @ValidateIf(o => o.totalBiaya !== undefined)
  totalBiaya?: number;
}

export class CalculatePriceDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Unit motor harus dipilih' })
  unitId: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal mulai sewa harus diisi' })
  tanggalMulai: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal selesai sewa harus diisi' })
  tanggalSelesai: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { 
    message: 'Format jam mulai tidak valid. Gunakan format HH:MM (contoh: 08:00)' 
  })
  @IsNotEmpty({ message: 'Jam mulai sewa harus diisi' })
  jamMulai: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { 
    message: 'Format jam selesai tidak valid. Gunakan format HH:MM (contoh: 08:00)' 
  })
  @IsNotEmpty({ message: 'Jam selesai sewa harus diisi' })
  jamSelesai: string;

  @IsNumber()
  @Min(0, { message: 'Jumlah jas hujan harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 jas hujan' })
  @Transform(({ value }) => parseInt(value))
  @ValidateIf(o => o.jasHujan !== undefined)
  jasHujan?: number = 0;

  @IsNumber()
  @Min(0, { message: 'Jumlah helm harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 helm' })
  @Transform(({ value }) => parseInt(value))
  @ValidateIf(o => o.helm !== undefined)
  helm?: number = 0;
}
