import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterJenisMotorDto {
  @ApiProperty({ required: false, description: 'Kata kunci pencarian' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Merek motor' })
  @IsOptional()
  @IsString()
  merk?: string;

  @ApiProperty({ required: false, description: 'Kapasitas mesin minimum (cc)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  ccMin?: number;

  @ApiProperty({ required: false, description: 'Kapasitas mesin maksimum (cc)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  ccMax?: number;

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
