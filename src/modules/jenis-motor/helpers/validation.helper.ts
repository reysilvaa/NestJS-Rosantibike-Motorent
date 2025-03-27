import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

/**
 * Memverifikasi keberadaan jenis motor berdasarkan ID
 */
export async function verifyJenisMotorExists(
  id: string, 
  prisma: PrismaService,
  logger: Logger
) {
  try {
    const jenisMotor = await prisma.jenisMotor.findUnique({
      where: { id },
      include: {
        unitMotor: true,
      },
    });

    if (!jenisMotor) {
      throw new NotFoundException(`Jenis motor dengan ID "${id}" tidak ditemukan`);
    }

    return jenisMotor;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi jenis motor: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Memverifikasi apakah jenis motor dapat dihapus
 * (tidak memiliki unit motor terkait)
 */
export async function verifyCanDeleteJenisMotor(
  id: string,
  prisma: PrismaService,
  logger: Logger
) {
  try {
    const unitMotors = await prisma.unitMotor.findMany({
      where: { jenisId: id },
    });

    if (unitMotors.length > 0) {
      throw new Error(
        `Tidak dapat menghapus jenis motor karena masih memiliki ${unitMotors.length} unit terkait`,
      );
    }

    return true;
  } catch (error) {
    logger.error(`Gagal memverifikasi dapat dihapus: ${error.message}`, error.stack);
    throw error;
  }
} 