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

    // Periksa apakah transaksi sebelumnya telah selesai selama minimal 1 jam
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentTransaction = await this.prisma.transaksiSewa.findFirst({
      where: {
        unitId: createTransaksiDto.unitId,
        status: StatusTransaksi.SELESAI,
        updatedAt: { gte: oneHourAgo }
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (recentTransaction) {
      const waktuPengembalian = recentTransaction.updatedAt;
      const waktuSetelahSatuJam = new Date(waktuPengembalian);
      waktuSetelahSatuJam.setHours(waktuSetelahSatuJam.getHours() + 1);
      
      throw new BadRequestException(
        `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
      );
    }

    // Hitung total biaya jika tidak disediakan
    let totalBiaya = createTransaksiDto.totalBiaya;
    if (!totalBiaya) {
      const days = Math.ceil(
        (tanggalSelesai.getTime() - tanggalMulai.getTime()) / (1000 * 3600 * 24),
      );
      totalBiaya = days * Number(unitMotor.hargaSewa);
      
      // Tambahkan biaya jas hujan dan helm jika dipilih
      const biayaJasHujan = 5000; // Rp 5.000 per jas hujan
      const biayaHelm = 5000; // Rp 5.000 per helm
      
      if (createTransaksiDto.jasHujan) {
        totalBiaya += biayaJasHujan * createTransaksiDto.jasHujan;
      }
      
      if (createTransaksiDto.helm) {
        totalBiaya += biayaHelm * createTransaksiDto.helm;
      }
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
            jamMulai: createTransaksiDto.jamMulai || '08:00',
            jamSelesai: createTransaksiDto.jamSelesai || '08:00',
            jasHujan: createTransaksiDto.jasHujan || 0,
            helm: createTransaksiDto.helm || 0,
            totalBiaya,
            biayaDenda: 0,
          } as any,
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
      
      // Kirim notifikasi fasilitas jika ada penggunaan fasilitas
      if ((result as any).jasHujan > 0 || (result as any).helm > 0) {
        this.notificationGateway.sendFasilitasNotification({
          id: result.id,
          namaPenyewa: result.namaPenyewa,
          jasHujan: (result as any).jasHujan,
          helm: (result as any).helm,
          message: `Transaksi baru menggunakan ${(result as any).jasHujan} jas hujan dan ${(result as any).helm} helm`,
        });
      }

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
      if (
        updateTransaksiDto.tanggalMulai || 
        updateTransaksiDto.tanggalSelesai || 
        updateTransaksiDto.jasHujan !== undefined || 
        updateTransaksiDto.helm !== undefined
      ) {
        const days = Math.ceil(
          (tanggalSelesai.getTime() - tanggalMulai.getTime()) / (1000 * 3600 * 24),
        );
        const hargaSewaPerHari = Number(transaksi.unitMotor.hargaSewa);
        updateTransaksiDto.totalBiaya = days * hargaSewaPerHari;
        
        // Tambahkan biaya fasilitas
        const biayaJasHujan = 5000; // Rp 5.000 per jas hujan
        const biayaHelm = 5000; // Rp 5.000 per helm
        
        const jasHujanCount = updateTransaksiDto.jasHujan !== undefined 
          ? updateTransaksiDto.jasHujan 
          : (transaksi as any).jasHujan || 0;
          
        const helmCount = updateTransaksiDto.helm !== undefined 
          ? updateTransaksiDto.helm 
          : (transaksi as any).helm || 0;
        
        if (jasHujanCount) {
          updateTransaksiDto.totalBiaya += biayaJasHujan * jasHujanCount;
        }
        
        if (helmCount) {
          updateTransaksiDto.totalBiaya += biayaHelm * helmCount;
        }
      }

      // Update transaksi
      const updatedData: any = {
        ...(updateTransaksiDto.namaPenyewa && { namaPenyewa: updateTransaksiDto.namaPenyewa }),
        ...(updateTransaksiDto.noWhatsapp && { noWhatsapp: updateTransaksiDto.noWhatsapp }),
        ...(updateTransaksiDto.unitId && { unitId: updateTransaksiDto.unitId }),
        ...(updateTransaksiDto.tanggalMulai && { tanggalMulai: tanggalMulai }),
        ...(updateTransaksiDto.tanggalSelesai && { tanggalSelesai: tanggalSelesai }),
        ...(updateTransaksiDto.jamMulai && { jamMulai: updateTransaksiDto.jamMulai }),
        ...(updateTransaksiDto.jamSelesai && { jamSelesai: updateTransaksiDto.jamSelesai }),
        ...(updateTransaksiDto.jasHujan !== undefined && { jasHujan: updateTransaksiDto.jasHujan }),
        ...(updateTransaksiDto.helm !== undefined && { helm: updateTransaksiDto.helm }),
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
      throw new BadRequestException('Transaksi sewa ini sudah selesai');
    }

    try {
      // Hitung denda jika ada
      const biayaDenda = await this.hitungDenda(transaksi);

      // Mulai transaksi
      const result = await this.prisma.$transaction(async tx => {
        // Update status motor menjadi TERSEDIA
        await tx.unitMotor.update({
          where: { id: transaksi.unitId },
          data: { status: StatusMotor.TERSEDIA },
        });

        // Update status transaksi menjadi SELESAI dan tambahkan denda jika ada
        const updateData: any = { 
          status: StatusTransaksi.SELESAI,
          biayaDenda: biayaDenda
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

      // Kirim notifikasi
      this.notificationGateway.sendMotorStatusNotification({
        id: result.unitMotor.id,
        status: StatusMotor.TERSEDIA,
        platNomor: result.unitMotor.platNomor,
        message: `Unit motor ${result.unitMotor.platNomor} telah dikembalikan`,
      });
      
      // Jika ada denda, kirim notifikasi denda
      if (biayaDenda > 0) {
        this.notificationGateway.sendDendaNotification({
          id: result.id,
          namaPenyewa: result.namaPenyewa,
          noWhatsapp: result.noWhatsapp,
          unitMotor: result.unitMotor,
          biayaDenda: biayaDenda,
          message: `Transaksi dengan ID ${result.id} dikenakan denda sebesar Rp ${biayaDenda.toLocaleString('id-ID')}`,
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error saat menyelesaikan sewa: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Gagal menyelesaikan sewa');
    }
  }

  /**
   * Hitung denda keterlambatan pengembalian
   * Denda: Rp 15.000 per jam
   */
  private async hitungDenda(transaksi: any): Promise<number> {
    const now = new Date();
    const tanggalSelesai = new Date(transaksi.tanggalSelesai);
    
    // Tambahkan jam selesai ke tanggal selesai
    const [jamSelesai, menitSelesai] = transaksi.jamSelesai.split(':').map(Number);
    tanggalSelesai.setHours(jamSelesai, menitSelesai, 0, 0);

    // Jika waktu saat ini belum melewati waktu selesai, tidak ada denda
    if (now <= tanggalSelesai) {
      return 0;
    }

    // Hitung selisih jam, dibulatkan ke atas
    const diffMs = now.getTime() - tanggalSelesai.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    // Denda: Rp 15.000 per jam
    const dendaPerJam = 15000;
    const totalDenda = diffHours * dendaPerJam;

    return totalDenda;
  }

  /**
   * Mendapatkan laporan denda
   */
  async getLaporanDenda(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    // Gunakan where kondisi yang dinamis untuk menghindari error linter
    const whereClause: any = {
      status: StatusTransaksi.SELESAI,
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
  }
  
  /**
   * Mendapatkan laporan penggunaan fasilitas
   */
  async getLaporanFasilitas(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    // Gunakan where kondisi yang dinamis untuk menghindari error linter
    const whereClause: any = {
      updatedAt: {
        gte: start,
        lte: end,
      },
      OR: [
        { jasHujan: { gt: 0 } },
        { helm: { gt: 0 } },
      ],
    };
    
    const transaksi = await this.prisma.transaksiSewa.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
    
    const totalJasHujan = transaksi.reduce(
      (total, transaksi) => total + (transaksi as any).jasHujan,
      0,
    );
    
    const totalHelm = transaksi.reduce(
      (total, transaksi) => total + (transaksi as any).helm,
      0,
    );
    
    return {
      data: transaksi,
      totalJasHujan,
      totalHelm,
      periode: {
        mulai: start,
        selesai: end,
      },
    };
  }

  async findByPhone(noHP: string) {
    if (!noHP) {
      throw new BadRequestException('Nomor telepon harus diisi');
    }

    const transaksi = await this.prisma.transaksiSewa.findMany({
      where: {
        noWhatsapp: {
          contains: noHP,
          mode: 'insensitive' as const,
        },
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

    return transaksi;
  }
}
