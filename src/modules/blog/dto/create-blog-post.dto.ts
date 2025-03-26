import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
import { Transform, Expose } from 'class-transformer';
import { StatusArtikel } from '../../../common';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  judul: string;

  @IsString()
  @IsOptional()
  @Expose()
  @Transform(({ value, obj }) => {
    // Jika slug sudah ada, gunakan itu
    if (value) return value;
    
    // Jika tidak, buat slug dari judul
    if (obj.judul) {
      return obj.judul
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    return '';
  })
  slug?: string;

  @IsString()
  @IsNotEmpty()
  konten: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsEnum(StatusArtikel)
  @IsOptional()
  status?: StatusArtikel = StatusArtikel.DRAFT;
}
