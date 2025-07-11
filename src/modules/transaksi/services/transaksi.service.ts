import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService, TransaksiStatus, MotorStatus } from '../../../common';
import { RealtimeGateway } from '../../../common/modules/websocket';
import { CacheService } from '../../../common/modules/cache/services/cache.service';
import { handleError } from '../../../common/helpers';
import { formatWhatsappNumber } from '../../../common/helpers/whatsapp-formatter.helper';
import { TransaksiQueue } from '../queues/transaksi.queue';
import { WhatsappQueue } from '../../whatsapp/queues/whatsapp.queue';
import { UnitMotorService } from '../../unit-motor/services/unit-motor.service';
import type {
  CreateTransaksiDto,
  UpdateTransaksiDto,
  FilterTransaksiDto,
  CalculatePriceDto,
} from '../dto';
import {
  verifyTransaksiExists,
  verifyUnitMotorExists,
  verifyCanCompleteTransaksi,
} from '../helpers/validation.helper';
import { hitungDenda, hitungTotalBiaya } from '../helpers';
import { AvailabilityService } from '../../availability/services/availability.service';

@Injectable()
export class TransaksiService {
  private readonly logger = new Logger(TransaksiService.name);
  private readonly cacheKeyPrefix = 'transaksi:';
  
  constructor(
    private prisma: PrismaService,
    private unitMotorService: UnitMotorService,
    private transaksiQueue: TransaksiQueue,
    private whatsappQueue: WhatsappQueue,
    private realtimeGateway: RealtimeGateway,
    private availabilityService: AvailabilityService,
    private cacheService: CacheService,
  ) {}
  
  /**
   * Menginvalidasi cache transaksi
   */
  private async invalidateCache(): Promise<void> {
    try {
      await this.cacheService.delByPattern(`${this.cacheKeyPrefix}*`);
      this.logger.log('Cache transaksi berhasil diinvalidasi');
    } catch (error) {
      this.logger.error(`Gagal menginvalidasi cache transaksi: ${error.message}`);
    }
  }

  async findAll(filter: FilterTransaksiDto) {
    try {
      let searchCondition;
      if (filter.search) {
        const isPhoneNumber = /^\+?\d{8,15}$/.test(filter.search.replaceAll(/[\s()-]/g, ''));
        if (isPhoneNumber) {
          const formattedNumber = formatWhatsappNumber(filter.search);
          searchCondition = [
            { namaPenyewa: { contains: filter.search, mode: 'insensitive' as const } },
            { noWhatsapp: { contains: formattedNumber, mode: 'insensitive' as const } },
          ];
        } else {
          searchCondition = [
            { namaPenyewa: { contains: filter.search, mode: 'insensitive' as const } },
            { noWhatsapp: { contains: filter.search, mode: 'insensitive' as const } },
          ];
        }
      }

      const where = {
        ...(filter.unitId && { unitId: filter.unitId }),
        ...(filter.startDate && { tanggalMulai: { gte: new Date(filter.startDate) } }),
        ...(filter.endDate && { tanggalSelesai: { lte: new Date(filter.endDate) } }),
        OR: filter.search ? searchCondition : undefined,
        ...(filter.status && !Array.isArray(filter.status) && { status: filter.status }),
        ...(filter.status && Array.isArray(filter.status) && { status: { in: filter.status } }),
      };

      Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

      const page = Number(filter.page) || 1;
      const limit = Number(filter.limit) || 10;
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.transaksiSewa.count({
          where: {
            ...(where.unitId && { unitId: where.unitId }),
            ...(where.status && {
              status: typeof where.status === 'object' ? where.status : { equals: where.status },
            }),
            ...(where.OR && { OR: where.OR }),
            ...(where.tanggalMulai && { tanggalMulai: where.tanggalMulai }),
            ...(where.tanggalSelesai && { tanggalSelesai: where.tanggalSelesai }),
          },
        }),
        this.prisma.transaksiSewa.findMany({
          where: {
            ...(where.unitId && { unitId: where.unitId }),
            ...(where.status && {
              status: typeof where.status === 'object' ? where.status : { equals: where.status },
            }),
            ...(where.OR && { OR: where.OR }),
            ...(where.tanggalMulai && { tanggalMulai: where.tanggalMulai }),
            ...(where.tanggalSelesai && { tanggalSelesai: where.tanggalSelesai }),
          },
          include: {
            unitMotor: {
              include: {
                jenis: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar transaksi');
    }
  }

  async findOne(id: string) {
    try {
      return await verifyTransaksiExists(id, this.prisma, this.logger);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil detail transaksi dengan ID ${id}`);
    }
  }

  async create(createTransaksiDto: CreateTransaksiDto) {
    try {
      const unitMotor = await verifyUnitMotorExists(
        createTransaksiDto.unitId,
        this.prisma,
        this.logger,
      );

      const tanggalMulai = new Date(createTransaksiDto.tanggalMulai);
      const tanggalSelesai = new Date(createTransaksiDto.tanggalSelesai);

      await this.availabilityService.isUnitAvailable(
        createTransaksiDto.unitId,
        tanggalMulai,
        tanggalSelesai,
      );

      let totalBiaya = createTransaksiDto.totalBiaya;
      if (!totalBiaya) {
        totalBiaya = hitungTotalBiaya(
          tanggalMulai,
          tanggalSelesai,
          createTransaksiDto.jamMulai || '08:00',
          createTransaksiDto.jamSelesai || '08:00',
          Number(unitMotor.hargaSewa),
          this.logger,
        );
      }

      this.logger.log(`Total biaya sewa: ${totalBiaya}`, 'TransaksiService.create');

      const result = await this.prisma.$transaction(async tx => {
        const now = new Date();
        const isToday = tanggalMulai.toDateString() === now.toDateString();

        const newStatus = isToday ? MotorStatus.DISEWA : MotorStatus.DIPESAN;

        await tx.unitMotor.update({
          where: { id: unitMotor.id },
          data: { status: newStatus },
        });

        const transaksi = await tx.transaksiSewa.create({
          data: {
            namaPenyewa: createTransaksiDto.namaPenyewa,
            noWhatsapp: createTransaksiDto.noWhatsapp,
            unitId: createTransaksiDto.unitId,
            tanggalMulai,
            tanggalSelesai,
            jamMulai: createTransaksiDto.jamMulai || '08:00',
            jamSelesai: createTransaksiDto.jamSelesai || '08:00',
            helm: 1,
            jasHujan: 0,
            status: TransaksiStatus.AKTIF,
            totalBiaya,
          },
          include: {
            unitMotor: {
              include: {
                jenis: true,
              },
            },
          },
        });

        await this.transaksiQueue.addNotifikasiBookingJob(transaksi.id);

        const overdueTime = new Date(tanggalSelesai);
        overdueTime.setHours(
          parseInt(transaksi.jamSelesai.split(':')[0]),
          parseInt(transaksi.jamSelesai.split(':')[1]),
          0,
          0,
        );
        await this.transaksiQueue.addScheduleCekOverdueJob(transaksi.id, overdueTime);

        const reminderTime = new Date(overdueTime);
        reminderTime.setHours(reminderTime.getHours() - 3);
        if (reminderTime > new Date()) {
          await this.transaksiQueue.addPengingatPengembalianJob(transaksi.id);
        }

        try {
          this.realtimeGateway.sendToAll('motor-status-update', {
            id: transaksi.unitId,
            status: MotorStatus.DISEWA,
            platNomor: transaksi.unitMotor.platNomor,
            message: `Transaksi baru: ${transaksi.namaPenyewa}`,
          });
        } catch (wsError) {
          this.logger.error(`Gagal mengirim notifikasi WebSocket: ${wsError.message}`);
        }

        return transaksi;
      });

      // Invalidasi cache setelah membuat transaksi baru
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat transaksi');
    }
  }

  async update(id: string, updateTransaksiDto: UpdateTransaksiDto) {
    try {
      const existingTransaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

      if (
        updateTransaksiDto.unitId &&
        updateTransaksiDto.unitId !== existingTransaksi.unitId &&
        existingTransaksi.status === TransaksiStatus.AKTIF
      ) {
        throw new BadRequestException('Tidak dapat mengubah unit motor pada transaksi yang aktif');
      }

      if (
        updateTransaksiDto.unitId ||
        updateTransaksiDto.tanggalMulai ||
        updateTransaksiDto.tanggalSelesai
      ) {
        const unitId = updateTransaksiDto.unitId || existingTransaksi.unitId;
        const tanggalMulai = updateTransaksiDto.tanggalMulai
          ? new Date(updateTransaksiDto.tanggalMulai)
          : existingTransaksi.tanggalMulai;
        const tanggalSelesai = updateTransaksiDto.tanggalSelesai
          ? new Date(updateTransaksiDto.tanggalSelesai)
          : existingTransaksi.tanggalSelesai;

        await this.availabilityService.isUnitAvailable(unitId, tanggalMulai, tanggalSelesai, id);
      }

      let totalBiaya = updateTransaksiDto.totalBiaya;
      if (
        !totalBiaya &&
        (updateTransaksiDto.tanggalMulai ||
          updateTransaksiDto.tanggalSelesai ||
          updateTransaksiDto.jamMulai ||
          updateTransaksiDto.jamSelesai ||
          updateTransaksiDto.unitId)
      ) {
        const unitId = updateTransaksiDto.unitId || existingTransaksi.unitId;
        const unitMotor = await verifyUnitMotorExists(unitId, this.prisma, this.logger);

        const tanggalMulai = updateTransaksiDto.tanggalMulai
          ? new Date(updateTransaksiDto.tanggalMulai)
          : existingTransaksi.tanggalMulai;
        const tanggalSelesai = updateTransaksiDto.tanggalSelesai
          ? new Date(updateTransaksiDto.tanggalSelesai)
          : existingTransaksi.tanggalSelesai;
        const jamMulai = updateTransaksiDto.jamMulai || existingTransaksi.jamMulai;
        const jamSelesai = updateTransaksiDto.jamSelesai || existingTransaksi.jamSelesai;

        totalBiaya = hitungTotalBiaya(
          tanggalMulai,
          tanggalSelesai,
          jamMulai,
          jamSelesai,
          Number(unitMotor.hargaSewa),
          this.logger,
        );
      }

      const updateData: any = {
        ...(updateTransaksiDto.namaPenyewa && { namaPenyewa: updateTransaksiDto.namaPenyewa }),
        ...(updateTransaksiDto.noWhatsapp && { noWhatsapp: updateTransaksiDto.noWhatsapp }),
        ...(updateTransaksiDto.unitId && { unitId: updateTransaksiDto.unitId }),
        ...(updateTransaksiDto.tanggalMulai && {
          tanggalMulai: new Date(updateTransaksiDto.tanggalMulai),
        }),
        ...(updateTransaksiDto.tanggalSelesai && {
          tanggalSelesai: new Date(updateTransaksiDto.tanggalSelesai),
        }),
        ...(updateTransaksiDto.jamMulai && { jamMulai: updateTransaksiDto.jamMulai }),
        ...(updateTransaksiDto.jamSelesai && { jamSelesai: updateTransaksiDto.jamSelesai }),
        ...(updateTransaksiDto.status && { status: updateTransaksiDto.status }),
        ...(totalBiaya && { totalBiaya }),
      };

      if (Object.keys(updateData).length === 0) {
        return existingTransaksi;
      }

      let result;

      if (updateTransaksiDto.status === TransaksiStatus.SELESAI) {
        result = await this.selesaiSewa(id);
      } else {
        result = await this.prisma.$transaction(async tx => {
          if (updateTransaksiDto.unitId && updateTransaksiDto.unitId !== existingTransaksi.unitId) {
            await tx.unitMotor.update({
              where: { id: existingTransaksi.unitId },
              data: { status: MotorStatus.TERSEDIA },
            });

            const tanggalMulai = updateTransaksiDto.tanggalMulai
              ? new Date(updateTransaksiDto.tanggalMulai)
              : existingTransaksi.tanggalMulai;
            const now = new Date();
            const isToday = tanggalMulai.toDateString() === now.toDateString();
            const newStatus = isToday ? MotorStatus.DISEWA : MotorStatus.DIPESAN;

            await tx.unitMotor.update({
              where: { id: updateTransaksiDto.unitId },
              data: { status: newStatus },
            });
          } else if (
            updateTransaksiDto.tanggalMulai &&
            existingTransaksi.status === TransaksiStatus.AKTIF
          ) {
            const tanggalMulai = new Date(updateTransaksiDto.tanggalMulai);
            const now = new Date();
            const isToday = tanggalMulai.toDateString() === now.toDateString();
            const newStatus = isToday ? MotorStatus.DISEWA : MotorStatus.DIPESAN;

            await tx.unitMotor.update({
              where: { id: existingTransaksi.unitId },
              data: { status: newStatus },
            });
          }

          return tx.transaksiSewa.update({
            where: { id },
            data: updateData,
            include: {
              unitMotor: {
                include: {
                  jenis: true,
                },
              },
            },
          });
        });
        
        // Invalidasi cache setelah update transaksi
        await this.invalidateCache();
      }

      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui transaksi dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      const transaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

      const result = await this.prisma.$transaction(async tx => {
        await tx.unitMotor.update({
          where: { id: transaksi.unitId },
          data: { status: MotorStatus.TERSEDIA },
        });

        return tx.transaksiSewa.delete({
          where: { id },
        });
      });

      // Invalidasi cache setelah menghapus transaksi
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus transaksi dengan ID ${id}`);
    }
  }

  async selesaiSewa(id: string) {
    try {
      const transaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

      verifyCanCompleteTransaksi(transaksi, this.logger);

      const biayaDenda = hitungDenda(transaksi, this.logger);

      const result = await this.prisma.$transaction(async tx => {
        await tx.unitMotor.update({
          where: { id: transaksi.unitId },
          data: { status: MotorStatus.TERSEDIA },
        });

        const updateData: any = {
          status: TransaksiStatus.SELESAI,
          biayaDenda: biayaDenda,
        };

        const transaksiUpdated = await tx.transaksiSewa.update({
          where: { id },
          data: updateData,
          include: {
            unitMotor: {
              include: {
                jenis: true,
              },
            },
          },
        });

        return transaksiUpdated;
      });

      await this.transaksiQueue.addNotifikasiSelesaiJob(result.id);

      this.realtimeGateway.sendToAll('motor-status-update', {
        id: result.unitMotor.id,
        status: MotorStatus.TERSEDIA,
        platNomor: result.unitMotor.platNomor,
        message: `Unit motor ${result.unitMotor.platNomor} telah dikembalikan`,
      });

      if (biayaDenda > 0) {
        this.realtimeGateway.sendToAll('denda-notification', {
          id: result.id,
          namaPenyewa: result.namaPenyewa,
          noWhatsapp: result.noWhatsapp,
          unitMotor: result.unitMotor,
          biayaDenda: biayaDenda,
          message: `Transaksi dengan ID ${result.id} dikenakan denda sebesar Rp ${biayaDenda.toLocaleString('id-ID')}`,
        });
      }

      // Invalidasi cache setelah menyelesaikan transaksi
      await this.invalidateCache();
      
      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal menyelesaikan sewa dengan ID ${id}`);
    }
  }

  async getLaporanDenda(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      end.setHours(23, 59, 59, 999);

      const whereClause: any = {
        status: TransaksiStatus.SELESAI,
        biayaDenda: { gt: 0 },
        updatedAt: {
          gte: start,
          lte: end,
        },
      };

      const transaksiDengan = await this.prisma.transaksiSewa.findMany({
        where: whereClause,
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const totalDenda = transaksiDengan.reduce(
        (total, transaksi) => total + Number((transaksi as any).biayaDenda),
        0,
      );

      return {
        data: transaksiDengan,
        totalDenda,
        periode: {
          mulai: start,
          selesai: end,
        },
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mendapatkan laporan denda');
    }
  }

  async getLaporanFasilitas(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      end.setHours(23, 59, 59, 999);

      const whereClause: any = {
        updatedAt: {
          gte: start,
          lte: end,
        },
        OR: [{ jasHujan: { gt: 0 } }, { helm: { gt: 0 } }],
      };

      const transaksi = await this.prisma.transaksiSewa.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
      });

      const totalJasHujan = transaksi.reduce(
        (total, transaksi) => total + (transaksi as any).jasHujan,
        0,
      );

      const totalHelm = transaksi.reduce((total, transaksi) => total + (transaksi as any).helm, 0);

      return {
        data: transaksi,
        totalJasHujan,
        totalHelm,
        periode: {
          mulai: start,
          selesai: end,
        },
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mendapatkan laporan fasilitas');
    }
  }

  async findByPhone(noHP: string) {
    try {
      if (!noHP) {
        throw new BadRequestException('Nomor telepon harus diisi');
      }

      const formattedNumber = formatWhatsappNumber(noHP);
      this.logger.log(`Mencari transaksi dengan nomor HP: ${noHP} (diformat: ${formattedNumber})`);

      const transaksi = await this.prisma.transaksiSewa.findMany({
        where: {
          noWhatsapp: formattedNumber,
        },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`Ditemukan ${transaksi.length} transaksi dengan nomor HP ${formattedNumber}`);
      return transaksi;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mencari transaksi dengan nomor HP ${noHP}`);
    }
  }

  async calculatePrice(calculatePriceDto: CalculatePriceDto) {
    try {
      if (!calculatePriceDto.unitId) {
        throw new BadRequestException('ID unit motor harus disediakan');
      }

      if (!calculatePriceDto.tanggalMulai || !calculatePriceDto.tanggalSelesai) {
        throw new BadRequestException('Tanggal mulai dan selesai harus disediakan');
      }

      const unitMotor = await verifyUnitMotorExists(
        calculatePriceDto.unitId,
        this.prisma,
        this.logger,
      );

      const tanggalMulai = new Date(calculatePriceDto.tanggalMulai);
      const tanggalSelesai = new Date(calculatePriceDto.tanggalSelesai);

      if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
        throw new BadRequestException('Format tanggal tidak valid');
      }

      if (tanggalMulai >= tanggalSelesai) {
        throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
      }

      const jamMulai = calculatePriceDto.jamMulai || '08:00';
      const jamSelesai = calculatePriceDto.jamSelesai || '08:00';
      const hargaSewaPerHari = Number(unitMotor.hargaSewa);

      const tanggalJamMulai = new Date(tanggalMulai);
      const tanggalJamSelesai = new Date(tanggalSelesai);

      const [jamMulaiHour, jamMulaiMinute] = jamMulai.split(':').map(Number);
      const [jamSelesaiHour, jamSelesaiMinute] = jamSelesai.split(':').map(Number);

      tanggalJamMulai.setHours(jamMulaiHour, jamMulaiMinute, 0, 0);
      tanggalJamSelesai.setHours(jamSelesaiHour, jamSelesaiMinute, 0, 0);

      const diffHours = Math.max(
        1,
        Math.ceil((tanggalJamSelesai.getTime() - tanggalJamMulai.getTime()) / (1000 * 60 * 60)),
      );

      let fullDays = Math.floor(diffHours / 24);
      let extraHours = diffHours % 24;

      if (extraHours > 6) {
        fullDays += 1;
        extraHours = 0;
      }

      const totalBiaya = hitungTotalBiaya(
        tanggalMulai,
        tanggalSelesai,
        jamMulai,
        jamSelesai,
        hargaSewaPerHari,
        this.logger,
      );

      const dendaPerJam = process.env.DENDA_PER_JAM;
      const baseDailyPrice = fullDays * hargaSewaPerHari;
      const overduePrice = extraHours > 0 ? extraHours * Number(dendaPerJam) : 0;

      const jenisMotorData = await this.prisma.jenisMotor.findUnique({
        where: { id: unitMotor.jenisId },
      });

      return {
        unitMotor: {
          id: unitMotor.id,
          platNomor: unitMotor.platNomor,
          jenisMotor: {
            merk: jenisMotorData?.merk || '',
            model: jenisMotorData?.model || '',
            cc: jenisMotorData?.cc || 0,
          },
          hargaSewa: unitMotor.hargaSewa,
        },
        detailPerhitungan: {
          tanggalMulai: tanggalMulai.toISOString(),
          tanggalSelesai: tanggalSelesai.toISOString(),
          jamMulai,
          jamSelesai,
          totalJam: diffHours,
          jumlahHari: fullDays,
          jamTambahan: extraHours,
          biayaPerHari: hargaSewaPerHari,
          biayaHarian: baseDailyPrice,
          biayaKeterlambatan: overduePrice,
        },
        totalBiaya,
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal menghitung harga sewa');
    }
  }
}
