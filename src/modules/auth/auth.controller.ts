import { Controller, Post, Body, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login admin' })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil',
    schema: {
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        admin: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            username: { type: 'string', example: 'admin123' },
            nama: { type: 'string', example: 'Admin Rental' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Username atau password salah' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.debug(`Attempting login with username: ${loginDto.username}`);
    const admin = await this.authService.validateAdmin(loginDto.username, loginDto.password);
    if (!admin) {
      this.logger.warn(`Login failed for username: ${loginDto.username}`);
      throw new UnauthorizedException('Username atau password salah');
    }
    this.logger.log(`Login successful for username: ${loginDto.username}`);
    return this.authService.login(admin);
  }
}
