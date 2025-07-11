import type { Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import { TransaksiStatus } from '../../../common/interfaces/enum';

export async function verifyTransaksiExists(id: string, prisma: PrismaService, logger: Logger) {
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

export async function verifyUnitMotorExists(id: string, prisma: PrismaService, logger: Logger) {
  const unitMotor = await prisma.unitMotor.findUnique({
    where: { id },
  });

  if (!unitMotor) {
    logger.error(`Unit motor dengan ID ${id} tidak ditemukan`);
    throw new BadRequestException(`Unit motor dengan ID ${id} tidak ditemukan`);
  }

  return unitMotor;
}

export async function verifyUnitMotorAvailability(
  unitId: string,
  tanggalMulai: Date,
  tanggalSelesai: Date,
  transaksiId: string | null,
  prisma: PrismaService,
  logger: Logger,
) {
  if (tanggalMulai >= tanggalSelesai) {
    logger.error('Validasi tanggal gagal: Tanggal mulai harus sebelum tanggal selesai');
    throw new BadRequestException('Tanggal mulai harus sebelum tanggal selesai');
  }

  const whereCondition: any = {
    id: transaksiId ? { not: transaksiId } : undefined,
    unitId,
    status: { in: [TransaksiStatus.AKTIF] },
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

  const existingBooking = await prisma.transaksiSewa.findFirst({
    where: whereCondition,
  });

  if (existingBooking) {
    logger.error(
      `Unit motor dengan ID ${unitId} sudah dipesan pada rentang waktu tersebut (${tanggalMulai.toISOString()} - ${tanggalSelesai.toISOString()})`,
    );
    throw new BadRequestException('Unit motor sudah dipesan pada rentang waktu tersebut');
  }

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentTransaction = await prisma.transaksiSewa.findFirst({
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

    logger.error(
      `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
    );
    throw new BadRequestException(
      `Unit motor baru saja dikembalikan. Silakan pesan setelah ${waktuSetelahSatuJam.toLocaleTimeString('id-ID')}`,
    );
  }

  return true;
}

export function verifyCanCompleteTransaksi(transaksi: any, logger: Logger) {
  if (transaksi.status === TransaksiStatus.SELESAI) {
    logger.error(`Transaksi dengan ID ${transaksi.id} sudah selesai`);
    throw new BadRequestException('Transaksi sewa ini sudah selesai');
  }

  return true;
}
