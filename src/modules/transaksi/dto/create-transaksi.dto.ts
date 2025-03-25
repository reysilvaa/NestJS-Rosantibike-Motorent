import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTransaksiDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama penyewa tidak boleh kosong' })
  namaPenyewa: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp tidak boleh kosong' })
  noWhatsapp: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Unit motor harus dipilih' })
  unitId: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal mulai sewa harus diisi' })
  tanggalMulai: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal selesai sewa harus diisi' })
  tanggalSelesai: string;

  @IsNumber()
  @Min(0, { message: 'Total biaya harus lebih dari 0' })
  @Transform(({ value }) => parseFloat(value))
  @ValidateIf(o => o.totalBiaya !== undefined)
  totalBiaya?: number;
}
