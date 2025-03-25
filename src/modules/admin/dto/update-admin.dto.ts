import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdminDto {
  @ApiProperty({
    description: 'Username admin',
    example: 'admin123',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Username tidak boleh kosong jika diisi' })
  username?: string;

  @ApiProperty({
    description: 'Password admin',
    example: 'password123',
    minLength: 6,
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Password tidak boleh kosong jika diisi' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @ApiProperty({
    description: 'Nama admin',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong jika diisi' })
  nama?: string;
}
