import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Transform, Expose } from 'class-transformer';
import { ArtikelStatus, ArtikelStatusType } from '../../../common/interfaces/enum';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  judul: string;

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

  @IsUUID()
  @IsOptional()
  kategoriId?: string;

  @IsEnum(ArtikelStatus)
  @IsOptional()
  status?: ArtikelStatusType = ArtikelStatus.DRAFT;
}
