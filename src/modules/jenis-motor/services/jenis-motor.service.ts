import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';

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
      this.logger.error(`Gagal membuat jenis motor: ${error.message}`, error.stack);
      throw error;
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
      this.logger.error(`Gagal mengambil daftar jenis motor: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const jenisMotor = await this.prisma.jenisMotor.findUnique({
        where: { id },
        include: {
          unitMotor: true,
        },
      });

      if (!jenisMotor) {
        throw new NotFoundException(`Jenis motor dengan ID "${id}" tidak ditemukan`);
      }

      return jenisMotor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Gagal mengambil jenis motor: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, data: UpdateJenisMotorDto) {
    try {
      // Verifikasi bahwa jenis motor ada
      await this.findOne(id);

      return await this.prisma.jenisMotor.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Gagal mengupdate jenis motor: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // Verifikasi bahwa jenis motor ada
      await this.findOne(id);

      // Dapatkan semua unit yang terkait dengan jenis motor ini
      const unitMotors = await this.prisma.unitMotor.findMany({
        where: { jenisId: id },
      });

      // Jika ada unit motor terkait, batalkan penghapusan
      if (unitMotors.length > 0) {
        throw new Error(`Tidak dapat menghapus jenis motor karena masih memiliki ${unitMotors.length} unit terkait`);
      }

      return await this.prisma.jenisMotor.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Gagal menghapus jenis motor: ${error.message}`, error.stack);
      throw error;
    }
  }
}
