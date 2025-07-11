import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/modules/prisma/services/prisma.service';
import { TransaksiStatus } from '../../../common/interfaces/enum';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private prisma: PrismaService) {}

  validateDateRange(startDate: Date, endDate: Date): void {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
    }
  }

  generateDayList(startDate: Date, endDate: Date): Date[] {
    const dayList: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dayList.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dayList;
  }

  async isUnitAvailable(
    unitId: string,
    startDate: Date,
    endDate: Date,
    transaksiId: string | null = null,
  ): Promise<boolean> {
    this.validateDateRange(startDate, endDate);

    const whereCondition: any = {
      id: transaksiId ? { not: transaksiId } : undefined,
      unitId,
      status: { in: [TransaksiStatus.AKTIF, TransaksiStatus.OVERDUE] },
      OR: [
        {
          tanggalMulai: { lte: startDate },
          tanggalSelesai: { gte: startDate },
        },
        {
          tanggalMulai: { lte: endDate },
          tanggalSelesai: { gte: endDate },
        },
        {
          tanggalMulai: { gte: startDate },
          tanggalSelesai: { lte: endDate },
        },
      ],
    };

    const existingBooking = await this.prisma.transaksiSewa.findFirst({
      where: whereCondition,
    });

    if (existingBooking) {
      this.logger.error(
        `Unit motor dengan ID ${unitId} sudah dipesan pada rentang waktu tersebut (${startDate.toISOString()} - ${endDate.toISOString()})`,
      );
      throw new BadRequestException('Unit motor sudah dipesan pada rentang waktu tersebut');
    }

    await this.checkRecentReturn(unitId);

    return true;
  }

  async checkRecentReturn(unitId: string): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentTransaction = await this.prisma.transaksiSewa.findFirst({
      where: {
        unitId,
        status: TransaksiStatus.SELESAI,
        updatedAt: { gte: oneHourAgo },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (recentTransaction) {
      const waktuPengembalian = recentTransaction.updatedAt;
      const waktuSetelahSatuJam = new Date(waktuPengembalian);
      waktuSetelahSatuJam.setHours(waktuSetelahSatuJam.getHours() + 1);

      this.logger.error(
        `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
      );
      throw new BadRequestException(
        `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
      );
    }
  }

  async checkAvailability(startDate: string, endDate: string, jenisId?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    this.validateDateRange(start, end);

    this.logger.log(
      `Checking availability from ${startDate} to ${endDate}${jenisId ? ` for jenisId: ${jenisId}` : ''}`,
    );

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
                AND: [
                  { tanggalMulai: { lte: end } },
                  { tanggalSelesai: { gte: start } },
                  { status: { in: [TransaksiStatus.AKTIF, TransaksiStatus.OVERDUE] } },
                ],
              },
            ],
          },
        },
      },
    });

    this.logger.log(`Found ${unitMotors.length} units to check availability for`);

    const dayList = this.generateDayList(start, end);
    this.logger.log(`Generated ${dayList.length} days to check`);

    const availabilityData = unitMotors.map(unit => {
      const bookedDates: Date[] = [];

      for (const sewa of unit.sewa) {
        const sewaStart = new Date(sewa.tanggalMulai);
        const sewaEnd = new Date(sewa.tanggalSelesai);

        const bookedRange = this.generateDayList(
          sewaStart < start ? start : sewaStart,
          sewaEnd > end ? end : sewaEnd,
        );

        bookedDates.push(...bookedRange);
      }

      const uniqueBookedDates = new Set(bookedDates.map(date => date.toISOString().split('T')[0]));

      const dailyAvailability = dayList.map(day => {
        const dayString = day.toISOString().split('T')[0];
        return {
          date: dayString,
          isAvailable: !uniqueBookedDates.has(dayString),
        };
      });

      this.logger.log(
        `Unit ${unit.platNomor} has ${uniqueBookedDates.size} booked dates out of ${dayList.length} days`,
      );

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

    const result = {
      startDate: startDate,
      endDate: endDate,
      totalUnits: availabilityData.length,
      units: availabilityData,
    };

    this.logger.log(`Returning availability data for ${result.totalUnits} units`);
    return result;
  }
}
