import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { UnitMotorType, TransaksiType } from './types';
import { StatusTransaksi, StatusMotor } from '../../src/common/enums/status.enum';

export async function seedTransaksi(
  prisma: PrismaClient,
  unitMotor: UnitMotorType[],
): Promise<TransaksiType[]> {
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const transaksiData = [
    {
      namaPenyewa: 'Budi Santoso',
      noWhatsapp: '628123456789',
      unitId: unitMotor[0].id, 
      tanggalMulai: today,
      tanggalSelesai: tomorrow,
      status: StatusTransaksi.AKTIF,
      totalBiaya: new Decimal(75000),
    },
    {
      namaPenyewa: 'Andi Wijaya',
      noWhatsapp: '628234567890',
      unitId: unitMotor[2].id, 
      tanggalMulai: today,
      tanggalSelesai: nextWeek,
      status: StatusTransaksi.AKTIF,
      totalBiaya: new Decimal(875000), 
    },
  ];

  const transaksi: TransaksiType[] = [];
  for (const data of transaksiData) {
    
    const existingTransaksi = await prisma.transaksiSewa.findFirst({
      where: {
        namaPenyewa: data.namaPenyewa,
        unitId: data.unitId,
        tanggalMulai: {
          equals: data.tanggalMulai,
        },
      },
    });

    if (existingTransaksi) {
      console.log(`Transaksi untuk ${data.namaPenyewa} sudah ada`);
      transaksi.push(existingTransaksi);
    } else {
      const newTransaksi = await prisma.transaksiSewa.create({
        data: {
          namaPenyewa: data.namaPenyewa,
          noWhatsapp: data.noWhatsapp,
          unitId: data.unitId,
          tanggalMulai: data.tanggalMulai,
          tanggalSelesai: data.tanggalSelesai,
          status: data.status,
          totalBiaya: data.totalBiaya,
        },
      });
      transaksi.push(newTransaksi);
      console.log(`Transaksi untuk ${newTransaksi.namaPenyewa} berhasil dibuat`);
      
      await prisma.unitMotor.update({
        where: { id: data.unitId },
        data: { status: StatusMotor.DISEWA },
      });
    }
  }
  return transaksi;
}
