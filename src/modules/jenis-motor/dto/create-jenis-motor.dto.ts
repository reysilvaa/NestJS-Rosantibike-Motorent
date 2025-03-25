import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJenisMotorDto {
  @ApiProperty({
    description: 'Merk motor',
    example: 'Honda',
  })
  @IsString()
  @IsNotEmpty({ message: 'Merk tidak boleh kosong' })
  merk: string;

  @ApiProperty({
    description: 'Model motor',
    example: 'Vario 125',
  })
  @IsString()
  @IsNotEmpty({ message: 'Model tidak boleh kosong' })
  model: string;

  @ApiProperty({
    description: 'Kapasitas mesin motor dalam CC',
    example: 125,
    minimum: 50,
  })
  @IsInt()
  @Min(50, { message: 'CC motor minimal 50' })
  cc: number;
}
