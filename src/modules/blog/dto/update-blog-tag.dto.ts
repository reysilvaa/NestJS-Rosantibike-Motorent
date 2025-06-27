import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateBlogTagDto {
  @ApiProperty({ description: 'Nama tag blog (opsional)', required: false })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiProperty({ description: 'Slug tag blog (opsional)', required: false })
  @IsString()
  @IsOptional()
  slug?: string;
} 