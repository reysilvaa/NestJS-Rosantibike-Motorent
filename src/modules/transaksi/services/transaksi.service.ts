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
      unitId: filter.unitId,
      status: Array.isArray(filter.status) ? { in: filter.status } : filter.status,
      OR: filter.search
        ? [
            {
              namaPenyewa: {
                contains: filter.search,
                mode: 'insensitive' as const,
              },
            },
            {
              noWhatsapp: {
                contains: filter.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
      tanggalMulai: filter.startDate ? { gte: new Date(filter.startDate) } : undefined,
      tanggalSelesai: filter.endDate ? { lte: new Date(filter.endDate) } : undefined,
    };

    // Hapus filter yang undefined
    Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.transaksiSewa.count({ where }),
      this.prisma.transaksiSewa.findMany({
        where,
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
      // Jika mengubah unit motor
      if (updateTransaksiDto.unitId && updateTransaksiDto.unitId !== transaksi.unitId) {
        // Pastikan unit motor baru ada
        const newUnitMotor = await this.prisma.unitMotor.findUnique({
          where: { id: updateTransaksiDto.unitId },
        });

        if (!newUnitMotor) {
          throw new BadRequestException(
            `Unit motor dengan ID ${updateTransaksiDto.unitId} tidak ditemukan`,
          );
        }

        // Periksa ketersediaan unit baru
        const tanggalMulai = updateTransaksiDto.tanggalMulai
          ? new Date(updateTransaksiDto.tanggalMulai)
          : transaksi.tanggalMulai;

        const tanggalSelesai = updateTransaksiDto.tanggalSelesai
          ? new Date(updateTransaksiDto.tanggalSelesai)
          : transaksi.tanggalSelesai;

        const existingBooking = await this.prisma.transaksiSewa.findFirst({
          where: {
            id: { not: id },
            unitId: updateTransaksiDto.unitId,
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

      // Jika mengubah tanggal mulai atau selesai
      if (updateTransaksiDto.tanggalMulai || updateTransaksiDto.tanggalSelesai) {
        const tanggalMulai = updateTransaksiDto.tanggalMulai
          ? new Date(updateTransaksiDto.tanggalMulai)
          : transaksi.tanggalMulai;

        const tanggalSelesai = updateTransaksiDto.tanggalSelesai
          ? new Date(updateTransaksiDto.tanggalSelesai)
          : transaksi.tanggalSelesai;

        if (tanggalMulai >= tanggalSelesai) {
          throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
        }

        // Periksa apakah unit baru/lama sudah dipesan pada rentang waktu tertentu
        const unitId = updateTransaksiDto.unitId || transaksi.unitId;

        const existingBooking = await this.prisma.transaksiSewa.findFirst({
          where: {
            id: { not: id },
            unitId,
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

        // Hitung ulang total biaya jika dibutuhkan
        if (
          !updateTransaksiDto.totalBiaya &&
          (updateTransaksiDto.tanggalMulai || updateTransaksiDto.tanggalSelesai)
        ) {
          const days = Math.ceil(
            (tanggalSelesai.getTime() - tanggalMulai.getTime()) / (1000 * 3600 * 24),
          );
          updateTransaksiDto.totalBiaya = days * Number(transaksi.unitMotor.hargaSewa);
        }
      }

      // Update transaksi
      return this.prisma.transaksiSewa.update({
        where: { id },
        data: updateTransaksiDto,
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
        this.logger.error('Gagal memperbarui transaksi sewa:', error.message);
      }
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Gagal memperbarui transaksi sewa');
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
