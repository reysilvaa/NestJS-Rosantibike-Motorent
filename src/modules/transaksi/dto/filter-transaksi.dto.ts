import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import type { StatusTransaksi } from '../../../common/enums/status.enum';
import { Transform } from 'class-transformer';

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
      return value.split(',').map(status => status.trim() as StatusTransaksi);
    }
    return value;
  })
  status?: StatusTransaksi | StatusTransaksi[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}
