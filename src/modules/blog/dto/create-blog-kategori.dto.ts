import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform, Expose } from 'class-transformer';

export class CreateBlogKategoriDto {
  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsString()
  @IsOptional()
  @Expose()
  @Transform(({ value, obj }) => {
    if (value) return value;

    if (obj.nama) {
      return obj.nama
        .toLowerCase()
        .replaceAll(/[^\da-z]+/g, '-')
        .replaceAll(/(^-|-$)/g, '');
    }
    return null;
  })
  slug?: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;
}