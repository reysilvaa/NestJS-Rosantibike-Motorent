import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../../admin/services/admin.service';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  async validateAdmin(username: string, password: string): Promise<any> {
    this.logger.log(`Mencoba validasi admin dengan username: ${username}`);
    const admin = await this.adminService.findByUsername(username);

    if (!admin) {
      this.logger.warn(`Admin dengan username ${username} tidak ditemukan`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    this.logger.log(`Password valid: ${isPasswordValid}`);

    if (isPasswordValid) {
      const { password: _password, ...result } = admin;
      return result;
    }

    return null;
  }

  async login(admin: any) {
    this.logger.log(`Login berhasil untuk admin: ${admin.username}`);
    const payload = { username: admin.username, sub: admin.id };
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        nama: admin.nama,
      },
    };
  }

  setCookies(response: Response, token: string): void {
    const domain = process.env.COOKIE_DOMAIN || 'admin.rosantibikemotorent.com';
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger.log(`Setting cookie with domain: ${domain}, secure: ${isProduction}`);

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: isProduction ? domain : undefined,
    };

    response.cookie('accessToken', token, cookieOptions);
  }

  clearCookies(response: Response): void {
    const domain = process.env.COOKIE_DOMAIN || 'admin.rosantibikemotorent.com';
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger.log(`Clearing cookies with domain: ${domain}, secure: ${isProduction}`);

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      expires: new Date(0),
      domain: isProduction ? domain : undefined,
    };

    response.clearCookie('accessToken', cookieOptions);

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Clear-Site-Data', '"cookies", "storage"');
  }
}
