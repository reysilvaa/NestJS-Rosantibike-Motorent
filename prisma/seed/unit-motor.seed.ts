import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JenisMotorType, UnitMotorType } from './types';
import { StatusMotor } from '../../src/common/enums/status.enum';

export async function seedUnitMotor(
  prisma: PrismaClient,
  jenisMotor: JenisMotorType[],
): Promise<UnitMotorType[]> {
  const unitMotorData = [
    {
      jenisId: jenisMotor[0].id, // Honda Beat
      platNomor: 'AB 1234 CD',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[0].id, // Honda Beat
      platNomor: 'AB 2345 CD',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[1].id, // Yamaha NMAX
      platNomor: 'AB 3456 CD',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[2].id, // Honda PCX
      platNomor: 'AB 4567 CD',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[3].id, // Vespa Sprint
      platNomor: 'AB 5678 CD',
      hargaSewa: new Decimal(150000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[4].id, // Kawasaki Ninja 250
      platNomor: 'AB 6789 CD',
      hargaSewa: new Decimal(200000),
      status: StatusMotor.TERSEDIA,
    },
  ];

  const unitMotor: UnitMotorType[] = [];
  for (const data of unitMotorData) {
    // Cek apakah unit motor sudah ada
    const existingUnit = await prisma.unitMotor.findUnique({
      where: { platNomor: data.platNomor },
    });

    if (existingUnit) {
      console.log(`Unit motor ${data.platNomor} sudah ada`);
      unitMotor.push(existingUnit);
    } else {
      const unit = await prisma.unitMotor.create({
        data: {
          jenisId: data.jenisId,
          platNomor: data.platNomor,
          hargaSewa: data.hargaSewa,
          status: data.status,
        },
      });
      unitMotor.push(unit);
      console.log(`Unit motor ${unit.platNomor} berhasil dibuat`);
    }
  }
  return unitMotor;
}
