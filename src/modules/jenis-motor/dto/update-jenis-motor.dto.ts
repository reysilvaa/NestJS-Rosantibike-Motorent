import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateJenisMotorDto {
  @ApiProperty({
    description: 'Merk motor',
    example: 'Honda',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Merk tidak boleh kosong' })
  merk?: string;

  @ApiProperty({
    description: 'Model motor',
    example: 'Vario 125',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Model tidak boleh kosong' })
  model?: string;

  @ApiProperty({
    description: 'Kapasitas mesin motor dalam CC',
    example: 125,
    minimum: 50,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Min(50, { message: 'CC motor minimal 50' })
  cc?: number;
}
