import { IsString, IsOptional, IsNumber, IsUUID, Min, IsEnum, IsInt, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { MotorStatus, MotorStatusType } from '../../../common/interfaces/enum';

export class UpdateUnitMotorDto {
  @IsUUID()
  @IsOptional()
  jenisId?: string;

  @IsString()
  @IsOptional()
  platNomor?: string;

  @IsEnum(MotorStatus)
  @IsOptional()
  status?: MotorStatusType;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Harga sewa harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  hargaSewa?: number;

  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(new Date().getFullYear())
  tahunPembuatan?: number;
}
