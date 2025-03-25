import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
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
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    description: 'Nama admin',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  nama: string;
}
