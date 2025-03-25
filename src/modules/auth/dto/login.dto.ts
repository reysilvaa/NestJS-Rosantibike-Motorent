import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username admin',
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  username: string;

  @ApiProperty({
    description: 'Password admin',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
}
