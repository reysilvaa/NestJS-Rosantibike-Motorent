import { IsString, IsArray, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Transform, Expose } from 'class-transformer';
import { ArtikelStatus, ArtikelStatusType } from '../../../common/interfaces/enum';

export class UpdateBlogPostDto {
  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
  @Expose()
  @Transform(({ value, obj }) => {
    if (value) return value;

    if (obj.judul) {
      return obj.judul
        .toLowerCase()
        .replaceAll(/[^\da-z]+/g, '-')
        .replaceAll(/(^-|-$)/g, '');
    }
    return null;
  })
  slug?: string;

  @IsString()
  @IsOptional()
  konten?: string;

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

  @IsUUID()
  @IsOptional()
  kategoriId?: string;

  @IsEnum(ArtikelStatus)
  @IsOptional()
  status?: ArtikelStatusType;
}
