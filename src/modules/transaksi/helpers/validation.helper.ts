import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StatusMotor, StatusTransaksi } from '../../../common/enums/status.enum';

/**
 * Memverifikasi keberadaan transaksi berdasarkan ID
 */
export async function verifyTransaksiExists(
  id: string, 
  prisma: PrismaService,
  logger: Logger
) {
  const transaksi = await prisma.transaksiSewa.findUnique({
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
    logger.error(`Transaksi dengan ID ${id} tidak ditemukan`);
    throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan`);
  }

  return transaksi;
}

/**
 * Memverifikasi keberadaan unit motor berdasarkan ID
 */
export async function verifyUnitMotorExists(
  id: string,
  prisma: PrismaService,
  logger: Logger
) {
  const unitMotor = await prisma.unitMotor.findUnique({
    where: { id },
  });

  if (!unitMotor) {
    logger.error(`Unit motor dengan ID ${id} tidak ditemukan`);
    throw new BadRequestException(`Unit motor dengan ID ${id} tidak ditemukan`);
  }

  return unitMotor;
}

/**
 * Memverifikasi ketersediaan unit motor pada rentang waktu tertentu
 */
export async function verifyUnitMotorAvailability(
  unitId: string,
  tanggalMulai: Date,
  tanggalSelesai: Date,
  transaksiId: string | null,
  prisma: PrismaService,
  logger: Logger
) {
  if (tanggalMulai >= tanggalSelesai) {
    logger.error('Validasi tanggal gagal: Tanggal mulai harus sebelum tanggal selesai');
    throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
  }

  // Buat kondisi where yang mengecualikan transaksi saat ini (jika ada)
  const whereCondition: any = {
    id: transaksiId ? { not: transaksiId } : undefined,
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
  };

  // Periksa apakah unit sudah dipesan pada rentang waktu tertentu
  const existingBooking = await prisma.transaksiSewa.findFirst({
    where: whereCondition,
  });

  if (existingBooking) {
    logger.error(`Unit motor dengan ID ${unitId} sudah dipesan pada rentang waktu tersebut (${tanggalMulai.toISOString()} - ${tanggalSelesai.toISOString()})`);
    throw new BadRequestException('Unit motor sudah dipesan pada rentang waktu tersebut');
  }

  // Periksa apakah transaksi sebelumnya telah selesai selama minimal 1 jam
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentTransaction = await prisma.transaksiSewa.findFirst({
    where: {
      unitId,
      status: StatusTransaksi.SELESAI,
      updatedAt: { gte: oneHourAgo }
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (recentTransaction) {
    const waktuPengembalian = recentTransaction.updatedAt;
    const waktuSetelahSatuJam = new Date(waktuPengembalian);
    waktuSetelahSatuJam.setHours(waktuSetelahSatuJam.getHours() + 1);
    
    logger.error(`Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`);
    throw new BadRequestException(
      `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
    );
  }

  return true;
}

/**
 * Memverifikasi apakah transaksi dapat diselesaikan
 */
export function verifyCanCompleteTransaksi(transaksi: any, logger: Logger) {
  if (transaksi.status === StatusTransaksi.SELESAI) {
    logger.error(`Transaksi dengan ID ${transaksi.id} sudah selesai`);
    throw new BadRequestException('Transaksi sewa ini sudah selesai');
  }

  return true;
}