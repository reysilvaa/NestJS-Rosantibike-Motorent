import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService, StatusMotor, StatusTransaksi } from '../../../common';
import {
  CreateUnitMotorDto,
  UpdateUnitMotorDto,
  FilterUnitMotorDto,
  CheckAvailabilityDto,
} from '../dto';
import { handleError } from '../../../common/helpers';

@Injectable()
export class UnitMotorService {
  private readonly logger = new Logger(UnitMotorService.name);
  
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterUnitMotorDto = {}) {
    try {
      const where = {
        ...(filter.jenisId && { jenisId: filter.jenisId }),
        ...(filter.status && { status: filter.status }),
        ...(filter.search && {
          platNomor: { contains: filter.search, mode: 'insensitive' as const },
        }),
      };

      // Hapus filter yang undefined
      Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

      return this.prisma.unitMotor.findMany({
        where,
        include: {
          jenis: true,
        },
        orderBy: { createdAt: 'desc' },
      });
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

  async create(createUnitMotorDto: CreateUnitMotorDto) {
    try {
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
    } catch (error) {
      handleError(this.logger, error, 'Gagal membuat unit motor baru');
    }
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

      const updateData = {
        ...(updateUnitMotorDto.platNomor && { platNomor: updateUnitMotorDto.platNomor }),
        ...(updateUnitMotorDto.jenisId && { jenisId: updateUnitMotorDto.jenisId }),
        ...(updateUnitMotorDto.status && { status: updateUnitMotorDto.status }),
        ...(updateUnitMotorDto.hargaSewa && { hargaSewa: updateUnitMotorDto.hargaSewa }),
      };

      return await this.prisma.unitMotor.update({
        where: { id },
        data: updateData,
        include: {
          jenis: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Jika error adalah Prisma not found error
      if (error.code === 'P2025') {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }
      
      handleError(this.logger, error, `Gagal memperbarui unit motor dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      // Periksa apakah motor sedang disewa
      const unit = await this.prisma.unitMotor.findUnique({
        where: { id },
      });

      if (!unit) {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      if (unit.status === StatusMotor.DISEWA || unit.status === StatusMotor.OVERDUE) {
        throw new BadRequestException('Unit motor sedang disewa, tidak dapat dihapus');
      }

      return await this.prisma.unitMotor.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Jika error adalah Prisma not found error
      if (error.code === 'P2025') {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }
      
      handleError(this.logger, error, `Gagal menghapus unit motor dengan ID ${id}`);
    }
  }

  async checkAvailability(checkAvailabilityDto: CheckAvailabilityDto) {
    try {
      const { startDate, endDate, jenisId } = checkAvailabilityDto;
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validasi tanggal
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Format tanggal tidak valid');
      }

      if (start > end) {
        throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
      }

      // Dapatkan semua unit motor yang tersedia
      const whereClause: any = {};
      if (jenisId) {
        whereClause.jenisId = jenisId;
      }

      const unitMotors = await this.prisma.unitMotor.findMany({
        where: whereClause,
        include: {
          jenis: true,
          sewa: {
            where: {
              OR: [
                {
                  // Transaksi yang rentang waktunya tumpang tindih dengan permintaan
                  AND: [
                    { tanggalMulai: { lte: end } },
                    { tanggalSelesai: { gte: start } },
                    { status: { in: [StatusTransaksi.AKTIF, StatusTransaksi.OVERDUE] } },
                  ],
                },
              ],
            },
          },
        },
      });

      // Buat array tanggal untuk periode yang diminta
      const dayList = this.generateDayList(start, end);

      // Buat respons ketersediaan untuk setiap motor
      const availabilityData = unitMotors.map(unit => {
        const bookedDates: Date[] = [];

        // Periksa setiap transaksi sewa untuk unit ini
        for (const sewa of unit.sewa) {
          const sewaStart = new Date(sewa.tanggalMulai);
          const sewaEnd = new Date(sewa.tanggalSelesai);

          // Tambahkan tanggal yang dipesan ke dalam array
          const bookedRange = this.generateDayList(
            sewaStart < start ? start : sewaStart,
            sewaEnd > end ? end : sewaEnd,
          );

          bookedDates.push(...bookedRange);
        }

        // Hapus duplikat
        const uniqueBookedDates = [
          ...new Set(bookedDates.map(date => date.toISOString().split('T')[0])),
        ];

        // Buat data ketersediaan untuk setiap hari
        const dailyAvailability = dayList.map(day => {
          const dayString = day.toISOString().split('T')[0];
          return {
            date: dayString,
            isAvailable: !uniqueBookedDates.includes(dayString),
          };
        });

        return {
          unitId: unit.id,
          platNomor: unit.platNomor,
          jenisMotor: {
            id: unit.jenis.id,
            merk: unit.jenis.merk,
            model: unit.jenis.model,
            cc: unit.jenis.cc,
          },
          hargaSewa: unit.hargaSewa,
          status: unit.status,
          availability: dailyAvailability,
        };
      });

      return {
        startDate: startDate,
        endDate: endDate,
        totalUnits: availabilityData.length,
        units: availabilityData,
      };
    } catch (error) {
      handleError(this.logger, error, 'Gagal memeriksa ketersediaan motor');
    }
  }

  // Fungsi bantuan untuk menghasilkan array tanggal
  private generateDayList(startDate: Date, endDate: Date): Date[] {
    const dayList: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dayList.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dayList;
  }
}
