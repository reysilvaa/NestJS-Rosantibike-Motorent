import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { StatusArtikel } from '../../../common';

export class FilterBlogPostDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StatusArtikel)
  @IsOptional()
  status?: StatusArtikel;

  @IsString()
  @IsOptional()
  tagId?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}
