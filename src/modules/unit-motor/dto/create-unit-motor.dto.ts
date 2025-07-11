import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
  IsDecimal,
  IsOptional,
  IsEnum,
  IsInt,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MotorStatus, MotorStatusType } from '../../../common/interfaces/enum';

export class CreateUnitMotorDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Jenis motor harus dipilih' })
  jenisId: string;

  @IsString()
  @IsNotEmpty({ message: 'Plat nomor tidak boleh kosong' })
  platNomor: string;

  @IsDecimal()
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Harga sewa harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  hargaSewa: number;

  @IsEnum(MotorStatus)
  @IsOptional()
  status?: MotorStatusType;

  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(new Date().getFullYear())
  tahunPembuatan?: number;
}
