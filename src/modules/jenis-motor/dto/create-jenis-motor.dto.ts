import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateJenisMotorDto {
  @IsString()
  @IsNotEmpty({ message: 'Merk tidak boleh kosong' })
  merk: string;

  @IsString()
  @IsNotEmpty({ message: 'Model tidak boleh kosong' })
  model: string;

  @IsInt()
  @Min(50, { message: 'CC motor minimal 50' })
  cc: number;
}
