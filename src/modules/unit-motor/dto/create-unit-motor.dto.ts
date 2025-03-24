import { IsString, IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUnitMotorDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Jenis motor harus dipilih' })
  jenisId: string;

  @IsString()
  @IsNotEmpty({ message: 'Plat nomor tidak boleh kosong' })
  platNomor: string;

  @IsNumber()
  @Min(0, { message: 'Harga sewa harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  hargaSewa: number;
}
