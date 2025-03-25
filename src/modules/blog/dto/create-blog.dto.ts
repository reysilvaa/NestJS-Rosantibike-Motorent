import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({
    description: 'Nama Blog',
    example: 'Contoh Blog',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
