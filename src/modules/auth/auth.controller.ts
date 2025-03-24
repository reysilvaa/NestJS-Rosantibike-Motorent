import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login admin' })
  @ApiResponse({ status: 200, description: 'Login berhasil' })
  @ApiResponse({ status: 401, description: 'Login gagal' })
  async login(@Body() loginDto: { username: string; password: string }) {
    const admin = await this.authService.validateAdmin(loginDto.username, loginDto.password);
    if (!admin) {
      throw new UnauthorizedException('Username atau password salah');
    }
    return this.authService.login(admin);
  }
}
