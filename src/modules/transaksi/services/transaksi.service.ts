import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UnitMotorService } from '../../unit-motor/services/unit-motor.service';
import { CreateTransaksiDto, UpdateTransaksiDto, FilterTransaksiDto } from '../dto/index';
import { StatusMotor, StatusTransaksi } from '../../../common/enums/status.enum';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationGateway } from '../../../common/gateway/notification.gateway';

@Injectable()
export class TransaksiService {
  private readonly logger = new Logger(TransaksiService.name);
  constructor(
    private prisma: PrismaService,
    private unitMotorService: UnitMotorService,
    @InjectQueue('transaksi') private transaksiQueue: Queue,
    private notificationGateway: NotificationGateway,
  ) {}

  async findAll(filter: FilterTransaksiDto) {
    const where = {
      ...(filter.unitId && { unitId: filter.unitId }),
      ...(filter.startDate && { tanggalMulai: { gte: new Date(filter.startDate) } }),
      ...(filter.endDate && { tanggalSelesai: { lte: new Date(filter.endDate) } }),
      OR: filter.search
        ? [
            {
              namaPenyewa: { contains: filter.search, mode: 'insensitive' as const },
            },
            {
              noWhatsapp: { contains: filter.search, mode: 'insensitive' as const },
            },
          ]
        : undefined,
      ...(filter.status && !Array.isArray(filter.status) && { status: filter.status }),
      ...(filter.status && Array.isArray(filter.status) && { status: { in: filter.status } }),
    };

    // Hapus filter yang undefined
    Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.transaksiSewa.count({ 
        where: {
          ...(where.unitId && { unitId: where.unitId }),
          ...(where.status && { 
            status: typeof where.status === 'object' 
              ? where.status 
              : { equals: where.status } 
          }),
          ...(where.OR && { OR: where.OR }),
          ...(where.tanggalMulai && { tanggalMulai: where.tanggalMulai }),
          ...(where.tanggalSelesai && { tanggalSelesai: where.tanggalSelesai }),
        } 
      }),
      this.prisma.transaksiSewa.findMany({
        where: {
          ...(where.unitId && { unitId: where.unitId }),
          ...(where.status && { 
            status: typeof where.status === 'object' 
              ? where.status 
              : { equals: where.status } 
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
  }

  async findOne(id: string) {
    const transaksi = await this.prisma.transaksiSewa.findUnique({
      where: { id },
      include: {
        unitMotor: {
          include: {
            jenis: true,
          },
        },
      },
    });

    if (!transaksi) {
      throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan`);
    }

    return transaksi;
  }

  async create(createTransaksiDto: CreateTransaksiDto) {
    // Pastikan unit motor ada
    const unitMotor = await this.prisma.unitMotor.findUnique({
      where: { id: createTransaksiDto.unitId },
    });

    if (!unitMotor) {
      throw new BadRequestException(
        `Unit motor dengan ID ${createTransaksiDto.unitId} tidak ditemukan`,
      );
    }

    // Periksa ketersediaan unit pada rentang waktu tertentu
    const tanggalMulai = new Date(createTransaksiDto.tanggalMulai);
    const tanggalSelesai = new Date(createTransaksiDto.tanggalSelesai);

    if (tanggalMulai >= tanggalSelesai) {
      throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
    }

    // Periksa apakah unit sudah dipesan pada rentang waktu tertentu
    const existingBooking = await this.prisma.transaksiSewa.findFirst({
      where: {
        unitId: createTransaksiDto.unitId,
        status: { in: [StatusTransaksi.AKTIF] },
        OR: [
          {
            tanggalMulai: { lte: tanggalMulai },
            tanggalSelesai: { gte: tanggalMulai },
          },
          {
            tanggalMulai: { lte: tanggalSelesai },
            tanggalSelesai: { gte: tanggalSelesai },
          },
          {
            tanggalMulai: { gte: tanggalMulai },
            tanggalSelesai: { lte: tanggalSelesai },
          },
        ],
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Unit motor sudah dipesan pada rentang waktu tersebut');
    }

    // Hitung total biaya jika tidak disediakan
    let totalBiaya = createTransaksiDto.totalBiaya;
    if (!totalBiaya) {
      const days = Math.ceil(
        (tanggalSelesai.getTime() - tanggalMulai.getTime()) / (1000 * 3600 * 24),
      );
      totalBiaya = days * Number(unitMotor.hargaSewa);
    }

    try {
      // Mulai transaksi
      const result = await this.prisma.$transaction(async tx => {
        // Update status motor menjadi DIPESAN jika tanggal mulai di masa depan
        // atau DISEWA jika tanggal mulai hari ini
        const now = new Date();
        const isToday = tanggalMulai.toDateString() === now.toDateString();

        const newStatus = isToday ? StatusMotor.DISEWA : StatusMotor.DIPESAN;

        // Update status motor
        await tx.unitMotor.update({
          where: { id: unitMotor.id },
          data: { status: newStatus },
        });

        // Buat transaksi sewa
        const transaksi = await tx.transaksiSewa.create({
          data: {
            namaPenyewa: createTransaksiDto.namaPenyewa,
            noWhatsapp: createTransaksiDto.noWhatsapp,
            unitId: createTransaksiDto.unitId,
            tanggalMulai,
            tanggalSelesai,
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

        return transaksi;
      });

      // Kirim notifikasi WhatsApp
      await this.transaksiQueue.add('kirim-notifikasi-booking', {
        transaksiId: result.id,
      });

      // Kirim notifikasi real-time ke admin
      this.notificationGateway.sendNewTransactionNotification({
        id: result.id,
        namaPenyewa: result.namaPenyewa,
        noWhatsapp: result.noWhatsapp,
        unitMotor: result.unitMotor,
        tanggalMulai: result.tanggalMulai,
        tanggalSelesai: result.tanggalSelesai,
        totalBiaya: result.totalBiaya,
      });

      // Jadwalkan pengingat sebelum pengembalian
      const reminderTime = new Date(tanggalSelesai);
      reminderTime.setHours(reminderTime.getHours() - 1);

      await this.transaksiQueue.add(
        'kirim-pengingat-pengembalian',
        { transaksiId: result.id },
        { delay: reminderTime.getTime() - Date.now() },
      );

      // Jadwalkan pengecekan overdue
      const overdueTime = new Date(tanggalSelesai);
      overdueTime.setHours(overdueTime.getHours() + 1);

      await this.transaksiQueue.add(
        'cek-overdue',
        { transaksiId: result.id },
        { delay: overdueTime.getTime() - Date.now() },
      );

      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Gagal membuat transaksi sewa:', error.message);
      }
      throw new InternalServerErrorException('Gagal membuat transaksi sewa');
    }
  }

  async update(id: string, updateTransaksiDto: UpdateTransaksiDto) {
    // Periksa apakah transaksi ada
    const transaksi = await this.prisma.transaksiSewa.findUnique({
      where: { id },
      include: {
        unitMotor: true,
      },
    });

    if (!transaksi) {
      throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan`);
    }

    try {
      // Jika mengubah unit, periksa unit baru
      if (updateTransaksiDto.unitId && updateTransaksiDto.unitId !== transaksi.unitId) {
        const newUnitMotor = await this.prisma.unitMotor.findUnique({
          where: { id: updateTransaksiDto.unitId },
        });

        if (!newUnitMotor) {
          throw new BadRequestException(
            `Unit motor dengan ID ${updateTransaksiDto.unitId} tidak ditemukan`,
          );
        }
      }

      // Jika mengubah tanggal, periksa konflik booking
      let tanggalMulai = transaksi.tanggalMulai;
      let tanggalSelesai = transaksi.tanggalSelesai;

      if (updateTransaksiDto.tanggalMulai) {
        tanggalMulai = new Date(updateTransaksiDto.tanggalMulai);
      }

      if (updateTransaksiDto.tanggalSelesai) {
        tanggalSelesai = new Date(updateTransaksiDto.tanggalSelesai);
      }

      if (tanggalMulai >= tanggalSelesai) {
        throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
      }

      // Periksa konflik booking jika mengubah unit atau tanggal
      if (
        updateTransaksiDto.unitId ||
        updateTransaksiDto.tanggalMulai ||
        updateTransaksiDto.tanggalSelesai
      ) {
        const existingBooking = await this.prisma.transaksiSewa.findFirst({
          where: {
            id: { not: id },
            unitId: updateTransaksiDto.unitId || transaksi.unitId,
            status: { in: [StatusTransaksi.AKTIF] },
            OR: [
              {
                tanggalMulai: { lte: tanggalMulai },
                tanggalSelesai: { gte: tanggalMulai },
              },
              {
                tanggalMulai: { lte: tanggalSelesai },
                tanggalSelesai: { gte: tanggalSelesai },
              },
              {
                tanggalMulai: { gte: tanggalMulai },
                tanggalSelesai: { lte: tanggalSelesai },
              },
            ],
          },
        });

        if (existingBooking) {
          throw new BadRequestException('Unit motor sudah dipesan pada rentang waktu tersebut');
        }
      }

      // Hitung total biaya jika tanggal berubah
      if (updateTransaksiDto.tanggalMulai || updateTransaksiDto.tanggalSelesai) {
        const days = Math.ceil(
          (tanggalSelesai.getTime() - tanggalMulai.getTime()) / (1000 * 3600 * 24),
        );
        const hargaSewaPerHari = Number(transaksi.unitMotor.hargaSewa);
        updateTransaksiDto.totalBiaya = days * hargaSewaPerHari;
      }

      // Update transaksi
      const updatedData = {
        ...(updateTransaksiDto.namaPenyewa && { namaPenyewa: updateTransaksiDto.namaPenyewa }),
        ...(updateTransaksiDto.noWhatsapp && { noWhatsapp: updateTransaksiDto.noWhatsapp }),
        ...(updateTransaksiDto.unitId && { unitId: updateTransaksiDto.unitId }),
        ...(updateTransaksiDto.tanggalMulai && { tanggalMulai: tanggalMulai }),
        ...(updateTransaksiDto.tanggalSelesai && { tanggalSelesai: tanggalSelesai }),
        ...(updateTransaksiDto.totalBiaya && { totalBiaya: updateTransaksiDto.totalBiaya }),
        ...(updateTransaksiDto.status && { status: updateTransaksiDto.status }),
      };

      return this.prisma.transaksiSewa.update({
        where: { id },
        data: updatedData,
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Gagal memperbarui transaksi: ${error.message}`);
      }
      throw new InternalServerErrorException('Gagal memperbarui transaksi');
    }
  }

  async remove(id: string) {
    // Periksa apakah transaksi ada
    const transaksi = await this.prisma.transaksiSewa.findUnique({
      where: { id },
      include: {
        unitMotor: true,
      },
    });

    if (!transaksi) {
      throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan`);
    }

    try {
      // Hapus transaksi dan update status motor
      return await this.prisma.$transaction(async tx => {
        // Hapus transaksi
        await tx.transaksiSewa.delete({
          where: { id },
        });

        // Cek apakah ada transaksi aktif lain untuk unit motor ini
        const activeTransaksi = await tx.transaksiSewa.findFirst({
          where: {
            unitId: transaksi.unitId,
            status: StatusTransaksi.AKTIF,
          },
        });

        // Jika tidak ada transaksi aktif lain, set unit motor menjadi TERSEDIA
        if (!activeTransaksi) {
          await tx.unitMotor.update({
            where: { id: transaksi.unitId },
            data: { status: StatusMotor.TERSEDIA },
          });
        }

        return { message: 'Transaksi berhasil dihapus' };
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Gagal menghapus transaksi sewa:', error.message);
      }
      throw new InternalServerErrorException('Gagal menghapus transaksi sewa');
    }
  }

  async selesaiSewa(id: string) {
    // Periksa apakah transaksi ada
    const transaksi = await this.prisma.transaksiSewa.findUnique({
      where: { id },
      include: {
        unitMotor: true,
      },
    });

    if (!transaksi) {
      throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan`);
    }

    if (transaksi.status === StatusTransaksi.SELESAI) {
      throw new BadRequestException('Transaksi sudah selesai');
    }

    try {
      // Update transaksi dan status motor
      return await this.prisma.$transaction(async tx => {
        // Update transaksi
        const updatedTransaksi = await tx.transaksiSewa.update({
          where: { id },
          data: { status: StatusTransaksi.SELESAI },
          include: {
            unitMotor: {
              include: {
                jenis: true,
              },
            },
          },
        });

        // Cek apakah ada transaksi aktif lain untuk unit motor ini
        const activeTransaksi = await tx.transaksiSewa.findFirst({
          where: {
            unitId: transaksi.unitId,
            status: StatusTransaksi.AKTIF,
            id: { not: id },
          },
        });

        // Jika tidak ada transaksi aktif lain, set unit motor menjadi TERSEDIA
        if (!activeTransaksi) {
          await tx.unitMotor.update({
            where: { id: transaksi.unitId },
            data: { status: StatusMotor.TERSEDIA },
          });
        }

        // Kirim notifikasi WhatsApp terima kasih
        await this.transaksiQueue.add('kirim-notifikasi-selesai', {
          transaksiId: updatedTransaksi.id,
        });

        // Kirim notifikasi real-time ke admin
        this.notificationGateway.sendMotorStatusNotification({
          id: updatedTransaksi.unitMotor.id,
          status: StatusMotor.TERSEDIA,
          platNomor: updatedTransaksi.unitMotor.platNomor,
          message: `Unit motor ${updatedTransaksi.unitMotor.platNomor} sekarang tersedia`,
        });

        return updatedTransaksi;
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Gagal menyelesaikan transaksi sewa:', error.message);
      }
      throw new InternalServerErrorException('Gagal menyelesaikan transaksi sewa');
    }
  }
}
