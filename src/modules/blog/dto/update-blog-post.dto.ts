import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { StatusArtikel } from '../../../common';

export class UpdateBlogPostDto {
  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
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

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsEnum(StatusArtikel)
  @IsOptional()
  status?: StatusArtikel;
}
