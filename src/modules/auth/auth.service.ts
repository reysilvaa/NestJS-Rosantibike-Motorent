import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import * as bcrypt from 'bcrypt';

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
}
