import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class QrisTestDto {
  @ApiProperty({
    description: 'Transaction ID to get the amount from (if provided, nominal will be ignored)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  transaksiId?: string;

  @ApiProperty({
    description: 'Nominal amount for QRIS payment (used if transaksiId is not provided)',
    example: '50000',
    required: false,
  })
  @IsOptional()
  @IsString()
  nominal?: string;

  @ApiProperty({
    description: 'Tax type (r for rupiah, p for percentage)',
    example: 'r',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxtype?: 'r' | 'p';

  @ApiProperty({
    description: 'Fee amount',
    example: '2000',
    required: false,
  })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiProperty({
    description: 'Whether to return base64 encoded image',
    example: false,
    required: false,
  })
  @IsOptional()
  base64?: boolean;
} 