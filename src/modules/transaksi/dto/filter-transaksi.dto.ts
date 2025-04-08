import { IsOptional, IsString, IsDateString, IsUUID, IsNumber } from 'class-validator';
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
  @IsNumber()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  limit?: number = 10;
}
