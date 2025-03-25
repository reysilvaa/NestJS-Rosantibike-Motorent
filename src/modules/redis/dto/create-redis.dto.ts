import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRedisDto {
  @ApiProperty({
    description: 'Nama Redis',
    example: 'Contoh Redis',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
