import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { APP_CONSTANTS } from '../constants/app.constants';

export class PaginationDto {
  @ApiProperty({
    description: 'Halaman yang ingin ditampilkan',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Jumlah item per halaman',
    default: APP_CONSTANTS.DEFAULT_PAGE_SIZE,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(APP_CONSTANTS.MAX_PAGE_SIZE)
  limit?: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE);
  }
}
