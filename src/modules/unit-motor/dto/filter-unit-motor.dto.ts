import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsUUID, IsInt, IsArray, Min, Max, IsNumberString } from 'class-validator';
import { StatusMotor } from '../../../common/enums/status.enum';
import { Type, Transform } from 'class-transformer';

export class FilterUnitMotorDto {
  @ApiProperty({ required: false, description: 'ID jenis motor' })
  @IsUUID()
  @IsOptional()
  jenisId?: string;

  @ApiProperty({ required: false, description: 'Status motor', enum: StatusMotor })
  @IsEnum(StatusMotor)
  @IsOptional()
  status?: StatusMotor;

  @ApiProperty({ required: false, description: 'Kata kunci pencarian' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, description: 'Kapasitas mesin minimum (cc)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  ccMin?: number;

  @ApiProperty({ required: false, description: 'Kapasitas mesin maksimum (cc)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Max(5000)
  ccMax?: number;

  @ApiProperty({ required: false, description: 'Tahun pembuatan minimum' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1900)
  yearMin?: number;

  @ApiProperty({ required: false, description: 'Tahun pembuatan maksimum' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Max(new Date().getFullYear() + 5)
  yearMax?: number;

  @ApiProperty({
    required: false,
    description: 'Merek motor (bisa berupa string tunggal atau array)',
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }

    return value;
  })
  brands?: string[];

  @ApiProperty({ required: false, description: 'Nomor halaman', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Jumlah data per halaman', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
