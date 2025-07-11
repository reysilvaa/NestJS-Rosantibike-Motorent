import { IsOptional, IsString, IsDateString, IsUUID, IsNumber } from 'class-validator';
import { TransaksiStatusType } from '../../../common/interfaces/enum';
import { Transform } from 'class-transformer';

export class FilterTransaksiDto {
  @IsString()
  @IsOptional()
  search?: string;

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
      return value.split(',').map(status => status.trim() as TransaksiStatusType);
    }
    return value;
  })
  status?: TransaksiStatusType | TransaksiStatusType[];

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
