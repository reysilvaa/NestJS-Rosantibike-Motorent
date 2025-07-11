import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/modules/prisma/services/prisma.service';
import { CacheService } from '../../../common/modules/cache/services/cache.service';
import type { CreateJenisMotorDto, UpdateJenisMotorDto, FilterJenisMotorDto } from '../dto';
import { verifyJenisMotorExists, verifyCanDeleteJenisMotor } from '../helpers';
import { handleError } from '../../../common/helpers';

@Injectable()
export class JenisMotorService {
  private readonly logger = new Logger(JenisMotorService.name);
  private readonly cacheKeyPrefix = 'jenis-motor:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async create(data: CreateJenisMotorDto) {
    try {
      const slug = this.generateSlug(data.merk, data.model);

      const existingSlug = await this.prisma.jenisMotor.findFirst({
        where: { slug },
      });

      const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-6)}` : slug;

      const result = await this.prisma.jenisMotor.create({
        data: {
          merk: data.merk,
          model: data.model,
          cc: data.cc,
          gambar: data.gambar,
          slug: finalSlug,
        },
      });
      
      // Invalidasi cache setelah membuat data baru
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat jenis motor');
    }
  }
  
  /**
   * Menginvalidasi cache jenis motor
   */
  private async invalidateCache(): Promise<void> {
    try {
      await this.cacheService.delByPattern(`${this.cacheKeyPrefix}*`);
      this.logger.log('Cache jenis motor berhasil diinvalidasi');
    } catch (error) {
      this.logger.error(`Gagal menginvalidasi cache: ${error.message}`);
    }
  }

  async findAll(filter: FilterJenisMotorDto = {}) {
    try {
      const { page = 1, limit = 10, search, merk, ccMin, ccMax } = filter;
      const skip = (page - 1) * Number(limit);

      const whereCondition: any = {};

      if (search) {
        whereCondition.OR = [
          { merk: { contains: search, mode: 'insensitive' as const } },
          { model: { contains: search, mode: 'insensitive' as const } },
        ];
      }

      if (merk) {
        whereCondition.merk = { contains: merk, mode: 'insensitive' as const };
      }

      if (ccMin !== undefined || ccMax !== undefined) {
        whereCondition.cc = {
          ...(ccMin !== undefined && { gte: ccMin }),
          ...(ccMax !== undefined && { lte: ccMax }),
        };
      }

      const total = await this.prisma.jenisMotor.count({
        where: whereCondition,
      });

      const data = await this.prisma.jenisMotor.findMany({
        where: whereCondition,
        include: {
          unitMotor: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const totalPages = Math.ceil(total / Number(limit));

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
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
      const jenisMotor = await verifyJenisMotorExists(id, this.prisma, this.logger);

      const updateData = { ...data };

      if (data.merk || data.model) {
        const currentMerk = data.merk || jenisMotor.merk;
        const currentModel = data.model || jenisMotor.model;

        const newSlug = this.generateSlug(currentMerk, currentModel);

        const existingSlug = await this.prisma.jenisMotor.findFirst({
          where: {
            slug: newSlug,
            id: { not: id },
          },
        });

        const finalSlug = existingSlug ? `${newSlug}-${Date.now().toString().slice(-6)}` : newSlug;

        updateData.slug = finalSlug;
      }

      const result = await this.prisma.jenisMotor.update({
        where: { id },
        data: updateData,
      });
      
      // Invalidasi cache setelah update data
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengupdate jenis motor dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      await verifyJenisMotorExists(id, this.prisma, this.logger);

      await verifyCanDeleteJenisMotor(id, this.prisma, this.logger);

      const result = await this.prisma.jenisMotor.delete({
        where: { id },
      });
      
      // Invalidasi cache setelah menghapus data
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus jenis motor dengan ID ${id}`);
    }
  }

  private generateSlug(merk: string, model: string): string {
    const merkSlug = merk
      .toLowerCase()
      .replaceAll(/[^\s\w]/g, '')
      .replaceAll(/\s+/g, '-');
    const modelSlug = model
      .toLowerCase()
      .replaceAll(/[^\s\w]/g, '')
      .replaceAll(/\s+/g, '-');

    return `${merkSlug}-${modelSlug}`;
  }
}
