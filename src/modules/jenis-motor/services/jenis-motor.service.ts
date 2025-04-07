import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
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
      // Generate slug dari merk dan model
      const slug = this.generateSlug(data.merk, data.model);
      
      // Cek apakah slug sudah ada
      const existingSlug = await this.prisma.jenisMotor.findFirst({
        where: { slug },
      });
      
      // Jika slug sudah ada, tambahkan timestamp
      const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-6)}` : slug;
      
      return await this.prisma.jenisMotor.create({
        data: {
          merk: data.merk,
          model: data.model,
          cc: data.cc,
          gambar: data.gambar,
          slug: finalSlug,
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

  async findBySlug(slug: string) {
    try {
      const jenisMotor = await this.prisma.jenisMotor.findUnique({
        where: { slug },
        include: {
          unitMotor: true,
        },
      });

      if (!jenisMotor) {
        throw new NotFoundException(`Jenis motor dengan slug ${slug} tidak ditemukan`);
      }

      return jenisMotor;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil jenis motor dengan slug ${slug}`);
    }
  }

  async update(id: string, data: UpdateJenisMotorDto) {
    try {
      // Verifikasi bahwa jenis motor ada
      const jenisMotor = await verifyJenisMotorExists(id, this.prisma, this.logger);

      // Jika merk atau model berubah, update slug
      let updateData = { ...data };
      
      if (data.merk || data.model) {
        // Ambil data yang sudah ada
        const currentMerk = data.merk || jenisMotor.merk;
        const currentModel = data.model || jenisMotor.model;
        
        // Generate slug baru
        const newSlug = this.generateSlug(currentMerk, currentModel);
        
        // Cek apakah slug sudah ada (selain untuk jenis motor ini)
        const existingSlug = await this.prisma.jenisMotor.findFirst({
          where: { 
            slug: newSlug,
            id: { not: id }
          },
        });
        
        // Jika slug sudah ada, tambahkan identifier unik
        const finalSlug = existingSlug ? `${newSlug}-${Date.now().toString().slice(-6)}` : newSlug;
        
        // Tambahkan slug ke data update
        updateData.slug = finalSlug;
      }

      return await this.prisma.jenisMotor.update({
        where: { id },
        data: updateData,
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

  // Fungsi untuk menghasilkan slug dari merk dan model
  private generateSlug(merk: string, model: string): string {
    // Hapus karakter khusus dan ganti spasi dengan dash
    const merkSlug = merk.toLowerCase().replaceAll(/[^\w\s]/g, '').replaceAll(/\s+/g, '-');
    const modelSlug = model.toLowerCase().replaceAll(/[^\w\s]/g, '').replaceAll(/\s+/g, '-');
    
    return `${merkSlug}-${modelSlug}`;
  }
}
