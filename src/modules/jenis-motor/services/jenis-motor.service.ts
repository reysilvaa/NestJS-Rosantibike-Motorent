import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';
import { verifyJenisMotorExists, verifyCanDeleteJenisMotor } from '../helpers';
import { handleError } from '../../../common/helpers';

@Injectable()
export class JenisMotorService {
  private readonly logger = new Logger(JenisMotorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJenisMotorDto) {
    try {
      return await this.prisma.jenisMotor.create({
        data: {
          merk: data.merk,
          model: data.model,
          cc: data.cc,
          gambar: data.gambar,
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat jenis motor');
    }
  }

  async findAll() {
    try {
      return await this.prisma.jenisMotor.findMany({
        include: {
          unitMotor: true,
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar jenis motor');
    }
  }

  async findOne(id: string) {
    try {
      return await verifyJenisMotorExists(id, this.prisma, this.logger);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil jenis motor dengan ID ${id}`);
    }
  }

  async update(id: string, data: UpdateJenisMotorDto) {
    try {
      // Verifikasi bahwa jenis motor ada
      await verifyJenisMotorExists(id, this.prisma, this.logger);

      return await this.prisma.jenisMotor.update({
        where: { id },
        data,
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengupdate jenis motor dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      // Verifikasi bahwa jenis motor ada
      await verifyJenisMotorExists(id, this.prisma, this.logger);

      // Verifikasi bahwa jenis motor dapat dihapus
      await verifyCanDeleteJenisMotor(id, this.prisma, this.logger);

      return await this.prisma.jenisMotor.delete({
        where: { id },
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus jenis motor dengan ID ${id}`);
    }
  }
}
