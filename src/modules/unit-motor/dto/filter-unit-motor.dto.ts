import { IsOptional, IsEnum, IsString, IsUUID, IsInt, IsArray, Min, Max } from 'class-validator';
import { StatusMotor } from '../../../common/enums/status.enum';
import { Type, Transform } from 'class-transformer';

export class FilterUnitMotorDto {
  @IsUUID()
  @IsOptional()
  jenisId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StatusMotor)
  @IsOptional()
  status?: StatusMotor;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  ccMin?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Max(5000)
  ccMax?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1900)
  yearMin?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Max(new Date().getFullYear() + 5)
  yearMax?: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Jika nilai adalah string (dari query ?brands=merek1,merek2), pecah menjadi array
    if (typeof value === 'string') {
      return value.split(',');
    }
    // Jika sudah array, kembalikan apa adanya
    return value;
  })
  brands?: string[];
}
