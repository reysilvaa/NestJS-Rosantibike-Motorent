import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, StatusMotor } from '../../../common';
import { CreateUnitMotorDto, UpdateUnitMotorDto, FilterUnitMotorDto } from '../dto';

@Injectable()
export class UnitMotorService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterUnitMotorDto = {}) {
    const where = {
      jenisId: filter.jenisId,
      status: filter.status,
      platNomor: filter.search
        ? { contains: filter.search, mode: 'insensitive' as const }
        : undefined,
    };

    // Hapus filter yang undefined
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);

    return this.prisma.unitMotor.findMany({
      where,
      include: {
        jenis: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
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
  }

  async create(createUnitMotorDto: CreateUnitMotorDto) {
    // Periksa apakah jenis motor ada
    const jenisMotor = await this.prisma.jenisMotor.findUnique({
      where: { id: createUnitMotorDto.jenisId },
    });

    if (!jenisMotor) {
      throw new BadRequestException(
        `Jenis motor dengan ID ${createUnitMotorDto.jenisId} tidak ditemukan`,
      );
    }

    // Periksa apakah plat nomor sudah digunakan
    const existingUnit = await this.prisma.unitMotor.findUnique({
      where: { platNomor: createUnitMotorDto.platNomor },
    });

    if (existingUnit) {
      throw new BadRequestException(`Plat nomor ${createUnitMotorDto.platNomor} sudah digunakan`);
    }

    return this.prisma.unitMotor.create({
      data: createUnitMotorDto,
      include: {
        jenis: true,
      },
    });
  }

  async update(id: string, updateUnitMotorDto: UpdateUnitMotorDto) {
    try {
      // Jika mengubah plat nomor, periksa apakah sudah digunakan
      if (updateUnitMotorDto.platNomor) {
        const existingUnit = await this.prisma.unitMotor.findUnique({
          where: { platNomor: updateUnitMotorDto.platNomor },
        });

        if (existingUnit && existingUnit.id !== id) {
          throw new BadRequestException(
            `Plat nomor ${updateUnitMotorDto.platNomor} sudah digunakan`,
          );
        }
      }

      // Jika mengubah jenis motor, periksa apakah jenis motor ada
      if (updateUnitMotorDto.jenisId) {
        const jenisMotor = await this.prisma.jenisMotor.findUnique({
          where: { id: updateUnitMotorDto.jenisId },
        });

        if (!jenisMotor) {
          throw new BadRequestException(
            `Jenis motor dengan ID ${updateUnitMotorDto.jenisId} tidak ditemukan`,
          );
        }
      }

      return await this.prisma.unitMotor.update({
        where: { id },
        data: updateUnitMotorDto,
        include: {
          jenis: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
    }
  }

  async remove(id: string) {
    try {
      // Periksa apakah motor sedang disewa
      const unit = await this.prisma.unitMotor.findUnique({
        where: { id },
      });

      if (unit && (unit.status === StatusMotor.DISEWA || unit.status === StatusMotor.OVERDUE)) {
        throw new BadRequestException('Unit motor sedang disewa, tidak dapat dihapus');
      }

      return await this.prisma.unitMotor.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
    }
  }
}
