import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
import { StatusArtikel } from '../../../common';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  judul: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

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
