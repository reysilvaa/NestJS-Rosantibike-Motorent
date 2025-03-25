import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWhatsappDto {
  @ApiProperty({
    description: 'Nama Whatsapp',
    example: 'Contoh Whatsapp',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
