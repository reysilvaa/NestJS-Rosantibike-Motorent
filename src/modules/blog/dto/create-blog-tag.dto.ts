import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateBlogTagDto {
  @ApiProperty({ description: 'Nama tag blog' })
  @IsString()
  nama: string;

  @ApiProperty({ description: 'Slug tag blog (opsional)', required: false })
  @IsString()
  @IsOptional()
  slug?: string;
}
