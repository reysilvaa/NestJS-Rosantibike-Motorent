import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService, MotorStatus, TransaksiStatus } from '../../../common';
import type {
  CreateUnitMotorDto,
  UpdateUnitMotorDto,
  FilterUnitMotorDto,
  CheckAvailabilityDto,
} from '../dto';
import { handleError } from '../../../common/helpers';
import { UnitMotorQueue } from '../queues/unit-motor.queue';
import { AvailabilityService } from '../../availability/services/availability.service';

@Injectable()
export class UnitMotorService {
  private readonly logger = new Logger(UnitMotorService.name);

  constructor(
    private prisma: PrismaService,
    private unitMotorQueue: UnitMotorQueue,
    private availabilityService: AvailabilityService,
  ) {}

  async findAll(filter: FilterUnitMotorDto = {}) {
    try {
      const {
        ccMin,
        ccMax,
        yearMin,
        yearMax,
        brands,
        page = 1,
        limit = 10,
        ...otherFilters
      } = filter;
      const skip = (page - 1) * Number(limit);

      let whereClause: any = {
        ...(otherFilters.jenisId && { jenisId: otherFilters.jenisId }),
        ...(otherFilters.status && { status: otherFilters.status }),
        ...(otherFilters.search && {
          OR: [
            { platNomor: { contains: otherFilters.search, mode: 'insensitive' as const } },
            { jenis: { model: { contains: otherFilters.search, mode: 'insensitive' as const } } },
            { jenis: { merk: { contains: otherFilters.search, mode: 'insensitive' as const } } },
          ],
        }),
      };

      if (ccMin !== undefined || ccMax !== undefined) {
        whereClause.jenis = {
          ...whereClause.jenis,
          ...(ccMin !== undefined && { cc: { gte: Number(ccMin) } }),
          ...(ccMax !== undefined && { cc: { lte: Number(ccMax) } }),
        };
      }

      if (brands) {
        const brandsArray = Array.isArray(brands) ? brands : [brands];

        if (brandsArray.length > 0) {
          whereClause.jenis = {
            ...whereClause.jenis,
            merk: { in: brandsArray },
          };

          this.logger.log(`Filtering by brands: ${JSON.stringify(brandsArray)}`);
        }
      }

      Object.keys(whereClause).forEach(
        key => whereClause[key] === undefined && delete whereClause[key],
      );

      console.log('Filter where clause:', JSON.stringify(whereClause, null, 2));

      try {
        const modelInfo = await this.prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'unit_motor' AND column_name = 'tahunPembuatan'
        `;

        const hasTahunPembuatan = Array.isArray(modelInfo) && modelInfo.length > 0;
        this.logger.log(
          `Field tahunPembuatan ${hasTahunPembuatan ? 'ada' : 'tidak ada'} di tabel unit_motor`,
        );

        if (hasTahunPembuatan && (yearMin !== undefined || yearMax !== undefined)) {
          whereClause = {
            ...whereClause,
            ...(yearMin !== undefined && { tahunPembuatan: { gte: Number(yearMin) } }),
            ...(yearMax !== undefined && { tahunPembuatan: { lte: Number(yearMax) } }),
          };

          console.log(
            'Updated whereClause with tahunPembuatan:',
            JSON.stringify(whereClause, null, 2),
          );
        } else if (yearMin !== undefined || yearMax !== undefined) {
          this.logger.warn(
            'Filter tahun tidak dapat diterapkan karena kolom tahunPembuatan tidak ada',
          );
        }
      } catch (error) {
        this.logger.error('Gagal memeriksa struktur tabel:', error);
      }

      const total = await this.prisma.unitMotor.count({
        where: whereClause,
      });

      const data = await this.prisma.unitMotor.findMany({
        where: whereClause,
        include: {
          jenis: true,
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
      handleError(this.logger, error, 'Gagal mengambil daftar unit motor');
    }
  }

  async findOne(id: string) {
    try {
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id },
        include: {
          jenis: true,
        },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      return unitMotor;
    } catch (error) {
      handleError(this.logger, error, `Gagal mencari unit motor dengan ID ${id}`);
    }
  }

  async findBySlug(slug: string) {
    try {
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { slug },
        include: {
          jenis: true,
        },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan slug ${slug} tidak ditemukan`);
      }

      return unitMotor;
    } catch (error) {
      handleError(this.logger, error, `Gagal mencari unit motor dengan slug ${slug}`);
    }
  }

  async create(createUnitMotorDto: CreateUnitMotorDto) {
    try {
      const jenisMotor = await this.prisma.jenisMotor.findUnique({
        where: { id: createUnitMotorDto.jenisId },
      });

      if (!jenisMotor) {
        throw new BadRequestException(
          `Jenis motor dengan ID ${createUnitMotorDto.jenisId} tidak ditemukan`,
        );
      }

      const existingUnit = await this.prisma.unitMotor.findUnique({
        where: { platNomor: createUnitMotorDto.platNomor },
      });

      if (existingUnit) {
        throw new BadRequestException(`Plat nomor ${createUnitMotorDto.platNomor} sudah digunakan`);
      }

      const sanitizedPlat = createUnitMotorDto.platNomor.replaceAll(/\s+/g, '');
      const finalSlug = `${jenisMotor.slug}-${sanitizedPlat}`;

      const newUnit = await this.prisma.unitMotor.create({
        data: {
          ...createUnitMotorDto,
          slug: finalSlug,
        },
        include: {
          jenis: true,
        },
      });

      await this.unitMotorQueue.addMaintenanceReminderJob(newUnit.id);

      await this.unitMotorQueue.addSyncDataJob();

      return newUnit;
    } catch (error) {
      handleError(this.logger, error, 'Gagal membuat unit motor baru');
    }
  }

  async update(id: string, updateUnitMotorDto: UpdateUnitMotorDto) {
    try {
      const currentUnit = await this.prisma.unitMotor.findUnique({
        where: { id },
        include: { jenis: true },
      });

      if (!currentUnit) {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      if (updateUnitMotorDto.platNomor && updateUnitMotorDto.platNomor !== currentUnit.platNomor) {
        const existingUnit = await this.prisma.unitMotor.findUnique({
          where: { platNomor: updateUnitMotorDto.platNomor },
        });

        if (existingUnit && existingUnit.id !== id) {
          throw new BadRequestException(
            `Plat nomor ${updateUnitMotorDto.platNomor} sudah digunakan`,
          );
        }
      }

      let newSlug = currentUnit.slug;
      if (updateUnitMotorDto.jenisId || updateUnitMotorDto.platNomor) {
        const jenisId = updateUnitMotorDto.jenisId || currentUnit.jenisId;
        const platNomor = updateUnitMotorDto.platNomor || currentUnit.platNomor;

        let jenisSlug = currentUnit.jenis.slug;
        if (updateUnitMotorDto.jenisId && updateUnitMotorDto.jenisId !== currentUnit.jenisId) {
          const jenisMotor = await this.prisma.jenisMotor.findUnique({
            where: { id: jenisId },
          });

          if (!jenisMotor) {
            throw new BadRequestException(`Jenis motor dengan ID ${jenisId} tidak ditemukan`);
          }

          jenisSlug = jenisMotor.slug;
        }

        const sanitizedPlat = platNomor.replaceAll(/\s+/g, '');
        newSlug = `${jenisSlug}-${sanitizedPlat}`;
      }

      const updateData = {
        ...(updateUnitMotorDto.platNomor && { platNomor: updateUnitMotorDto.platNomor }),
        ...(updateUnitMotorDto.jenisId && { jenisId: updateUnitMotorDto.jenisId }),
        ...(updateUnitMotorDto.status && { status: updateUnitMotorDto.status }),
        ...(updateUnitMotorDto.hargaSewa && { hargaSewa: updateUnitMotorDto.hargaSewa }),
        ...((updateUnitMotorDto.jenisId || updateUnitMotorDto.platNomor) && { slug: newSlug }),
      };

      const updatedUnit = await this.prisma.unitMotor.update({
        where: { id },
        data: updateData,
        include: {
          jenis: true,
        },
      });

      if (updateUnitMotorDto.status) {
        await this.unitMotorQueue.addUpdateStatusJob(id, updateUnitMotorDto.status);
      }

      return updatedUnit;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      handleError(this.logger, error, `Gagal memperbarui unit motor dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      const unit = await this.prisma.unitMotor.findUnique({
        where: { id },
      });

      if (!unit) {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      if (unit.status === MotorStatus.DISEWA || unit.status === MotorStatus.OVERDUE) {
        throw new BadRequestException('Unit motor sedang disewa, tidak dapat dihapus');
      }

      const deletedUnit = await this.prisma.unitMotor.delete({
        where: { id },
      });

      await this.unitMotorQueue.addSyncDataJob();

      return deletedUnit;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      handleError(this.logger, error, `Gagal menghapus unit motor dengan ID ${id}`);
    }
  }

  async processUnitImages(unitMotorId: string, images: string[]) {
    try {
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      await this.unitMotorQueue.addProcessImageJob(unitMotorId, images);

      return {
        message: 'Pemrosesan gambar sudah dijadwalkan',
        unitMotorId,
        imagesCount: images.length,
      };
    } catch (error) {
      handleError(this.logger, error, `Gagal memproses gambar unit motor ${unitMotorId}`);
    }
  }

  async scheduleMaintenanceReminder(unitMotorId: string) {
    try {
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      await this.unitMotorQueue.addMaintenanceReminderJob(unitMotorId);

      return {
        message: 'Pengingat pemeliharaan sudah dijadwalkan',
        unitMotorId,
      };
    } catch (error) {
      handleError(
        this.logger,
        error,
        `Gagal menjadwalkan pengingat pemeliharaan untuk unit motor ${unitMotorId}`,
      );
    }
  }

  async checkAvailability(checkAvailabilityDto: CheckAvailabilityDto) {
    try {
      const { startDate, endDate, jenisId } = checkAvailabilityDto;
      return this.availabilityService.checkAvailability(startDate, endDate, jenisId);
    } catch (error) {
      handleError(this.logger, error, 'Gagal memeriksa ketersediaan motor');
    }
  }

  async getBrands() {
    try {
      const brands = await this.prisma.jenisMotor.findMany({
        select: {
          id: true,
          merk: true,
        },
        distinct: ['merk'],
        orderBy: {
          merk: 'asc',
        },
      });

      return brands;
    } catch (error) {
      handleError(this.logger, error, 'Gagal mengambil daftar merek motor');
    }
  }
}
