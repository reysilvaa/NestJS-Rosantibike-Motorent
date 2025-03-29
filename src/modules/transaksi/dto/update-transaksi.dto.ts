import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
  Matches,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { StatusTransaksi } from '../../../common/enums/status.enum';

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

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Format jam mulai tidak valid. Gunakan format HH:MM (contoh: 08:00)',
  })
  @IsOptional()
  jamMulai?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Format jam selesai tidak valid. Gunakan format HH:MM (contoh: 08:00)',
  })
  @IsOptional()
  jamSelesai?: string;

  @IsNumber()
  @Min(0, { message: 'Jumlah jas hujan harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 jas hujan' })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  jasHujan?: number;

  @IsNumber()
  @Min(0, { message: 'Jumlah helm harus 0 atau lebih' })
  @Max(2, { message: 'Maksimal 2 helm' })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  helm?: number;

  @IsEnum(StatusTransaksi)
  @IsOptional()
  status?: StatusTransaksi;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  totalBiaya?: number;
}
