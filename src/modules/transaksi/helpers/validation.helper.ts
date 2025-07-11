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

export function verifyCanCompleteTransaksi(transaksi: any, logger: Logger) {
  if (transaksi.status === TransaksiStatus.SELESAI) {
    logger.error(`Transaksi dengan ID ${transaksi.id} sudah selesai`);
    throw new BadRequestException('Transaksi sewa ini sudah selesai');
  }

  return true;
}
