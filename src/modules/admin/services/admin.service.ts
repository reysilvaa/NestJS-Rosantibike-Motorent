import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/modules/prisma/services/prisma.service';
import { CacheService } from '../../../common/modules/cache/services/cache.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly cacheKeyPrefix = 'admin:';
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Menginvalidasi cache admin
   */
  private async invalidateCache(): Promise<void> {
    try {
      await this.cacheService.delByPattern(`${this.cacheKeyPrefix}*`);
      this.logger.log('Cache admin berhasil diinvalidasi');
    } catch (error) {
      this.logger.error(`Gagal menginvalidasi cache admin: ${error.message}`);
    }
  }

  async findAll() {
    return this.prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nama: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!admin) {
      throw new NotFoundException(`Admin dengan ID ${id} tidak ditemukan`);
    }
    
    return admin;
  }

  async findByUsername(username: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });
    return admin;
  }

  async create(data: { username: string; password: string; nama: string }) {
    try {
      // Cek apakah username sudah digunakan
      const existingAdmin = await this.findByUsername(data.username);
      if (existingAdmin) {
        throw new BadRequestException(`Username ${data.username} sudah digunakan`);
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const result = await this.prisma.admin.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });
      
      // Invalidasi cache setelah membuat admin baru
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Gagal membuat admin: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: { username?: string; password?: string; nama?: string }) {
    try {
      // Verifikasi admin ada
      await this.findById(id);
      
      // Cek username unik jika diubah
      if (data.username) {
        const existingAdmin = await this.findByUsername(data.username);
        if (existingAdmin && existingAdmin.id !== id) {
          throw new BadRequestException(`Username ${data.username} sudah digunakan`);
        }
      }
      
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      
      const result = await this.prisma.admin.update({
        where: { id },
        data,
      });
      
      // Invalidasi cache setelah update admin
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Gagal update admin: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      // Verifikasi admin ada
      await this.findById(id);
      
      const result = await this.prisma.admin.delete({
        where: { id },
      });
      
      // Invalidasi cache setelah menghapus admin
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Gagal menghapus admin: ${error.message}`);
      throw error;
    }
  }
}
