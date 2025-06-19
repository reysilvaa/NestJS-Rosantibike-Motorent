import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Logger,
  Res,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from '../dto';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    this.logger.debug(`Attempting login with username: ${loginDto.username}`);
    const admin = await this.authService.validateAdmin(loginDto.username, loginDto.password);
    if (!admin) {
      this.logger.warn(`Login failed for username: ${loginDto.username}`);
      throw new UnauthorizedException('Username atau password salah');
    }
    this.logger.log(`Login successful for username: ${loginDto.username}`);
    const result = await this.authService.login(admin);
    response.cookie('accessToken', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return { admin: result.admin };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout admin' })
  @ApiResponse({ status: 200, description: 'Logout berhasil' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logout berhasil' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan data admin yang sedang login' })
  @ApiResponse({ status: 200, description: 'Data admin berhasil diambil' })
  async getProfile(@Req() req: Request) {
    return { admin: req.user };
  }
}
