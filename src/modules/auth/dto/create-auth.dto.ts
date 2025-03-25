import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthDto {
  @ApiProperty({
    description: 'Nama Auth',
    example: 'Contoh Auth',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
