import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService, StatusMotor, StatusTransaksi } from '../../../common';
import type {
  CreateUnitMotorDto,
  UpdateUnitMotorDto,
  FilterUnitMotorDto,
  CheckAvailabilityDto,
} from '../dto';
import { handleError } from '../../../common/helpers';
import { UnitMotorQueue } from '../queues/unit-motor.queue';

@Injectable()
export class UnitMotorService {
  private readonly logger = new Logger(UnitMotorService.name);

  constructor(
    private prisma: PrismaService,
    private unitMotorQueue: UnitMotorQueue,
  ) {}

  async findAll(filter: FilterUnitMotorDto = {}) {
    try {
      const { ccMin, ccMax, yearMin, yearMax, brands, ...otherFilters } = filter;

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

      // Filter jenis berdasarkan cc - pastikan konversi ke number
      if (ccMin !== undefined || ccMax !== undefined) {
        whereClause.jenis = {
          ...whereClause.jenis,
          ...(ccMin !== undefined && { cc: { gte: Number(ccMin) } }),
          ...(ccMax !== undefined && { cc: { lte: Number(ccMax) } }),
        };
      }

      // Filter berdasarkan merek - pastikan selalu array
      if (brands) {
        // Pastikan brands selalu diproses sebagai array
        const brandsArray = Array.isArray(brands) ? brands : [brands];

        // Hanya lanjutkan jika array tidak kosong
        if (brandsArray.length > 0) {
          whereClause.jenis = {
            ...whereClause.jenis,
            merk: { in: brandsArray },
          };

          // Log untuk debugging
          this.logger.log(`Filtering by brands: ${JSON.stringify(brandsArray)}`);
        }
      }

      // Hapus filter yang undefined
      Object.keys(whereClause).forEach(
        key => whereClause[key] === undefined && delete whereClause[key],
      );

      // Log untuk debugging
      console.log('Filter where clause:', JSON.stringify(whereClause, null, 2));

      // Coba mendapatkan model terlebih dahulu untuk memeriksa apakah field tahunPembuatan ada
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

        // Tambahkan filter tahun hanya jika kolom tahunPembuatan ada
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

      return this.prisma.unitMotor.findMany({
        where: whereClause,
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

      // Membuat slug dari slug jenis motor dan plat nomor
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

      // Jadwalkan pemeliharaan rutin unit motor baru
      await this.unitMotorQueue.addMaintenanceReminderJob(newUnit.id);

      // Jadwalkan sinkronisasi data setelah penambahan unit baru
      await this.unitMotorQueue.addSyncDataJob();

      return newUnit;
    } catch (error) {
      handleError(this.logger, error, 'Gagal membuat unit motor baru');
    }
  }

  async update(id: string, updateUnitMotorDto: UpdateUnitMotorDto) {
    try {
      // Dapatkan data motor saat ini
      const currentUnit = await this.prisma.unitMotor.findUnique({
        where: { id },
        include: { jenis: true },
      });

      if (!currentUnit) {
        throw new NotFoundException(`Unit motor dengan ID ${id} tidak ditemukan`);
      }

      // Jika mengubah plat nomor, periksa apakah sudah digunakan
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

      // Jika mengubah jenis motor atau plat nomor, update juga slug
      let newSlug = currentUnit.slug;
      if (updateUnitMotorDto.jenisId || updateUnitMotorDto.platNomor) {
        // Dapatkan data yang akan digunakan
        const jenisId = updateUnitMotorDto.jenisId || currentUnit.jenisId;
        const platNomor = updateUnitMotorDto.platNomor || currentUnit.platNomor;
        
        // Jika jenis motor berubah, dapatkan slug jenis motor baru
        let jenisSlug = currentUnit.jenis.slug;
        if (updateUnitMotorDto.jenisId && updateUnitMotorDto.jenisId !== currentUnit.jenisId) {
          const jenisMotor = await this.prisma.jenisMotor.findUnique({
            where: { id: jenisId },
          });

          if (!jenisMotor) {
            throw new BadRequestException(
              `Jenis motor dengan ID ${jenisId} tidak ditemukan`,
            );
          }
          
          jenisSlug = jenisMotor.slug;
        }
        
        // Generate slug baru dari slug jenis dan plat nomor
        const sanitizedPlat = platNomor.replaceAll(/\s+/g, '');
        newSlug = `${jenisSlug}-${sanitizedPlat}`;
      }

      const updateData = {
        ...(updateUnitMotorDto.platNomor && { platNomor: updateUnitMotorDto.platNomor }),
        ...(updateUnitMotorDto.jenisId && { jenisId: updateUnitMotorDto.jenisId }),
        ...(updateUnitMotorDto.status && { status: updateUnitMotorDto.status }),
        ...(updateUnitMotorDto.hargaSewa && { hargaSewa: updateUnitMotorDto.hargaSewa }),
        ...(updateUnitMotorDto.jenisId || updateUnitMotorDto.platNomor) && { slug: newSlug },
      };

      const updatedUnit = await this.prisma.unitMotor.update({
        where: { id },
        data: updateData,
        include: {
          jenis: true,
        },
      });

      // Jika status berubah, tambahkan job untuk memperbarui status
      if (updateUnitMotorDto.status) {
        await this.unitMotorQueue.addUpdateStatusJob(id, updateUnitMotorDto.status);
      }

      return updatedUnit;
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

      const deletedUnit = await this.prisma.unitMotor.delete({
        where: { id },
      });

      // Sinkronisasi data setelah penghapusan unit
      await this.unitMotorQueue.addSyncDataJob();

      return deletedUnit;
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

  async processUnitImages(unitMotorId: string, images: string[]) {
    try {
      // Memastikan unit motor ada
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      // Memasukkan tugas pemrosesan gambar ke dalam antrian
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
      // Memastikan unit motor ada
      const unitMotor = await this.prisma.unitMotor.findUnique({
        where: { id: unitMotorId },
      });

      if (!unitMotor) {
        throw new NotFoundException(`Unit motor dengan ID ${unitMotorId} tidak ditemukan`);
      }

      // Memasukkan tugas pengingat pemeliharaan ke dalam antrian
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
        const uniqueBookedDates = new Set(
          new Set(bookedDates.map(date => date.toISOString().split('T')[0])),
        );

        // Buat data ketersediaan untuk setiap hari
        const dailyAvailability = dayList.map(day => {
          const dayString = day.toISOString().split('T')[0];
          return {
            date: dayString,
            isAvailable: !uniqueBookedDates.has(dayString),
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

  async getBrands() {
    try {
      // Mengambil semua merk motor yang unik dari jenis motor
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
