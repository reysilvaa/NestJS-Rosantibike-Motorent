import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateJenisMotorDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Merk tidak boleh kosong' })
  merk?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Model tidak boleh kosong' })
  model?: string;

  @IsInt()
  @IsOptional()
  @Min(50, { message: 'CC motor minimal 50' })
  cc?: number;
}
