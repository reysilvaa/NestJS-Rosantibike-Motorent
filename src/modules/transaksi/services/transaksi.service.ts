import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UnitMotorService } from '../../unit-motor/services/unit-motor.service';
import type {
  CreateTransaksiDto,
  UpdateTransaksiDto,
  FilterTransaksiDto,
  CalculatePriceDto,
} from '../dto/index';
import { StatusMotor, StatusTransaksi } from '../../../common/enums/status.enum';
import { NotificationGateway } from '../../../common/gateway/notification.gateway';
import { handleError } from '../../../common/helpers';
import {
  hitungDenda,
  hitungTotalBiaya,
  verifyTransaksiExists,
  verifyUnitMotorExists,
  verifyUnitMotorAvailability,
  verifyCanCompleteTransaksi,
} from '../helpers';
import { TransaksiQueue } from '../queues/transaksi.queue';

@Injectable()
export class TransaksiService {
  private readonly logger = new Logger(TransaksiService.name);
  constructor(
    private prisma: PrismaService,
    private unitMotorService: UnitMotorService,
    private transaksiQueue: TransaksiQueue,
    private notificationGateway: NotificationGateway,
  ) {}

  async findAll(filter: FilterTransaksiDto) {
    try {
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
      // Pastikan unit motor ada
      const unitMotor = await verifyUnitMotorExists(
        createTransaksiDto.unitId,
        this.prisma,
        this.logger,
      );

      // Periksa ketersediaan unit pada rentang waktu tertentu
      const tanggalMulai = new Date(createTransaksiDto.tanggalMulai);
      const tanggalSelesai = new Date(createTransaksiDto.tanggalSelesai);

      // Verifikasi ketersediaan
      await verifyUnitMotorAvailability(
        createTransaksiDto.unitId,
        tanggalMulai,
        tanggalSelesai,
        null, // tidak ada transaksi ID karena ini pembuatan baru
        this.prisma,
        this.logger,
      );

      // Hitung total biaya jika tidak disediakan
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

        // Buat transaksi sewa dengan default values untuk fields yang tidak ada di DTO
        const transaksi = await tx.transaksiSewa.create({
          data: {
            namaPenyewa: createTransaksiDto.namaPenyewa,
            noWhatsapp: createTransaksiDto.noWhatsapp,
            unitId: createTransaksiDto.unitId,
            tanggalMulai,
            tanggalSelesai,
            jamMulai: createTransaksiDto.jamMulai || '08:00',
            jamSelesai: createTransaksiDto.jamSelesai || '08:00',
            helm: 1, // default values
            jasHujan: 0, // default values
            status: StatusTransaksi.AKTIF,
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

        // Tambahkan ke antrian untuk pemrosesan asinkron (seperti notifikasi, dll)
        await this.transaksiQueue.addNotifikasiBookingJob(transaksi.id);

        // Jadwalkan cek overdue untuk saat transaksi seharusnya selesai
        const overdueTime = new Date(tanggalSelesai);
        overdueTime.setHours(
          parseInt(transaksi.jamSelesai.split(':')[0]),
          parseInt(transaksi.jamSelesai.split(':')[1]),
          0,
          0,
        );
        await this.transaksiQueue.addScheduleCekOverdueJob(transaksi.id, overdueTime);

        // Jadwalkan pengingat pengembalian untuk 3 jam sebelum waktu pengembalian
        const reminderTime = new Date(overdueTime);
        reminderTime.setHours(reminderTime.getHours() - 3);
        if (reminderTime > new Date()) {
          await this.transaksiQueue.addPengingatPengembalianJob(transaksi.id);
        }

        // Kirim notifikasi melalui WebSocket
        try {
          this.notificationGateway.sendToAll('motor-status-update', {
            id: transaksi.unitId,
            status: StatusMotor.DISEWA,
            platNomor: transaksi.unitMotor.platNomor,
            message: `Transaksi baru: ${transaksi.namaPenyewa}`,
          });
        } catch (wsError) {
          this.logger.error(`Gagal mengirim notifikasi WebSocket: ${wsError.message}`);
        }

        return transaksi;
      });

      return result;
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat transaksi');
    }
  }

  async update(id: string, updateTransaksiDto: UpdateTransaksiDto) {
    try {
      // Periksa apakah transaksi ada
      const existingTransaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

      // Tidak mengizinkan mengubah unit motor jika transaksi sudah aktif
      if (
        updateTransaksiDto.unitId &&
        updateTransaksiDto.unitId !== existingTransaksi.unitId &&
        existingTransaksi.status === StatusTransaksi.AKTIF
      ) {
        throw new BadRequestException('Tidak dapat mengubah unit motor pada transaksi yang aktif');
      }

      // Periksa ketersediaan jika mengubah unitId, tanggalMulai, atau tanggalSelesai
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

        // Verifikasi ketersediaan
        await verifyUnitMotorAvailability(
          unitId,
          tanggalMulai,
          tanggalSelesai,
          id, // exclude current transaction
          this.prisma,
          this.logger,
        );
      }

      // Hitung total biaya jika parameter yang memengaruhi biaya diubah
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

      // Persiapkan data yang akan diperbarui
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

      // Jika tidak ada data yang diperbarui, kembalikan transaksi yang ada
      if (Object.keys(updateData).length === 0) {
        return existingTransaksi;
      }

      let result;

      // Update transaksi dan status unit motor jika diperlukan dalam transaksi database
      if (updateTransaksiDto.status === StatusTransaksi.SELESAI) {
        // Jika status diubah menjadi SELESAI, panggil method selesaiSewa
        result = await this.selesaiSewa(id);
      } else {
        result = await this.prisma.$transaction(async tx => {
          // Jika unitId berubah, update status motor lama dan baru
          if (updateTransaksiDto.unitId && updateTransaksiDto.unitId !== existingTransaksi.unitId) {
            // Update status motor lama menjadi tersedia
            await tx.unitMotor.update({
              where: { id: existingTransaksi.unitId },
              data: { status: StatusMotor.TERSEDIA },
            });

            // Update status motor baru
            const tanggalMulai = updateTransaksiDto.tanggalMulai
              ? new Date(updateTransaksiDto.tanggalMulai)
              : existingTransaksi.tanggalMulai;
            const now = new Date();
            const isToday = tanggalMulai.toDateString() === now.toDateString();
            const newStatus = isToday ? StatusMotor.DISEWA : StatusMotor.DIPESAN;

            await tx.unitMotor.update({
              where: { id: updateTransaksiDto.unitId },
              data: { status: newStatus },
            });
          } else if (
            updateTransaksiDto.tanggalMulai &&
            existingTransaksi.status === StatusTransaksi.AKTIF
          ) {
            // Jika tanggal mulai berubah, mungkin perlu update status motor
            const tanggalMulai = new Date(updateTransaksiDto.tanggalMulai);
            const now = new Date();
            const isToday = tanggalMulai.toDateString() === now.toDateString();
            const newStatus = isToday ? StatusMotor.DISEWA : StatusMotor.DIPESAN;

            await tx.unitMotor.update({
              where: { id: existingTransaksi.unitId },
              data: { status: newStatus },
            });
          }

          // Update transaksi
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
      }

      return result;
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui transaksi dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      // Periksa apakah transaksi ada
      const transaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

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
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus transaksi dengan ID ${id}`);
    }
  }

  async selesaiSewa(id: string) {
    try {
      const transaksi = await verifyTransaksiExists(id, this.prisma, this.logger);

      // Verifikasi transaksi dapat diselesaikan
      verifyCanCompleteTransaksi(transaksi, this.logger);

      // Hitung denda jika ada
      const biayaDenda = hitungDenda(transaksi, this.logger);

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

      // Kirim notifikasi WhatsApp konfirmasi transaksi selesai
      await this.transaksiQueue.addNotifikasiSelesaiJob(result.id);

      // Kirim notifikasi motor status update
      this.notificationGateway.sendToAll('motor-status-update', {
        id: result.unitMotor.id,
        status: StatusMotor.TERSEDIA,
        platNomor: result.unitMotor.platNomor,
        message: `Unit motor ${result.unitMotor.platNomor} telah dikembalikan`,
      });

      // Jika ada denda, kirim notifikasi denda
      if (biayaDenda > 0) {
        this.notificationGateway.sendToAll('denda-notification', {
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
      return handleError(this.logger, error, `Gagal menyelesaikan sewa dengan ID ${id}`);
    }
  }

  /**
   * Mendapatkan laporan denda
   */
  async getLaporanDenda(startDate: string, endDate: string) {
    try {
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
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mendapatkan laporan denda');
    }
  }

  /**
   * Mendapatkan laporan penggunaan fasilitas
   */
  async getLaporanFasilitas(startDate: string, endDate: string) {
    try {
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

      this.logger.log(`Mencari transaksi dengan nomor HP: ${noHP}`);

      const transaksi = await this.prisma.transaksiSewa.findMany({
        where: {
          noWhatsapp: noHP,
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

      this.logger.log(`Ditemukan ${transaksi.length} transaksi dengan nomor HP ${noHP}`);
      return transaksi;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mencari transaksi dengan nomor HP ${noHP}`);
    }
  }

  // Fungsi kalkulasi harga untuk API endpoint
  async calculatePrice(calculatePriceDto: CalculatePriceDto) {
    try {
      // Validasi input
      if (!calculatePriceDto.unitId) {
        throw new BadRequestException('ID unit motor harus disediakan');
      }

      if (!calculatePriceDto.tanggalMulai || !calculatePriceDto.tanggalSelesai) {
        throw new BadRequestException('Tanggal mulai dan selesai harus disediakan');
      }

      // Ambil informasi unit motor
      const unitMotor = await verifyUnitMotorExists(
        calculatePriceDto.unitId,
        this.prisma,
        this.logger,
      );

      // Konversi tanggal ke objek Date
      const tanggalMulai = new Date(calculatePriceDto.tanggalMulai);
      const tanggalSelesai = new Date(calculatePriceDto.tanggalSelesai);

      if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
        throw new BadRequestException('Format tanggal tidak valid');
      }

      if (tanggalMulai >= tanggalSelesai) {
        throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
      }

      // Gunakan helper function untuk menghitung biaya
      const jamMulai = calculatePriceDto.jamMulai || '08:00';
      const jamSelesai = calculatePriceDto.jamSelesai || '08:00';
      const hargaSewaPerHari = Number(unitMotor.hargaSewa);

      // Gabungkan tanggal dan jam untuk perhitungan yang lebih akurat
      const tanggalJamMulai = new Date(tanggalMulai);
      const tanggalJamSelesai = new Date(tanggalSelesai);

      // Set jam dari parameter
      const [jamMulaiHour, jamMulaiMinute] = jamMulai.split(':').map(Number);
      const [jamSelesaiHour, jamSelesaiMinute] = jamSelesai.split(':').map(Number);

      tanggalJamMulai.setHours(jamMulaiHour, jamMulaiMinute, 0, 0);
      tanggalJamSelesai.setHours(jamSelesaiHour, jamSelesaiMinute, 0, 0);

      // Hitung total jam
      const diffHours = Math.max(
        1,
        Math.ceil((tanggalJamSelesai.getTime() - tanggalJamMulai.getTime()) / (1000 * 60 * 60)),
      );

      // Hitung jumlah hari penuh dan jam tambahan
      let fullDays = Math.floor(diffHours / 24);
      let extraHours = diffHours % 24;

      // Jika keterlambatan lebih dari 6 jam, dihitung sebagai 1 hari penuh
      if (extraHours > 6) {
        fullDays += 1;
        extraHours = 0;
      }

      // Hitung biaya menggunakan helper function
      const totalBiaya = hitungTotalBiaya(
        tanggalMulai,
        tanggalSelesai,
        jamMulai,
        jamSelesai,
        hargaSewaPerHari,
        this.logger,
      );

      // Hitung komponen biaya untuk detail
      const dendaPerJam = process.env.DENDA_PER_JAM; // Tarif denda per jam
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
