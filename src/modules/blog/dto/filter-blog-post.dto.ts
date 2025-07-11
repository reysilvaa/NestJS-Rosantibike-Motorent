import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ArtikelStatus, ArtikelStatusType } from '../../../common/interfaces/enum';

export class FilterBlogPostDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ArtikelStatus)
  @IsOptional()
  status?: ArtikelStatusType;

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
