import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';
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

  @IsEnum(StatusTransaksi)
  @IsOptional()
  status?: StatusTransaksi;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  totalBiaya?: number;
}
