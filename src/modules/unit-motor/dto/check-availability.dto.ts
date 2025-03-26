import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @IsDateString()
  @ApiProperty({
    description: 'Tanggal awal untuk memeriksa ketersediaan',
    example: '2023-04-01',
  })
  startDate: string;

  @IsDateString()
  @ApiProperty({
    description: 'Tanggal akhir untuk memeriksa ketersediaan',
    example: '2023-04-30',
  })
  endDate: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: 'ID jenis motor (opsional)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  jenisId?: string;
}
