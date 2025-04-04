import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JenisMotorType, UnitMotorType } from './types';
import { StatusMotor } from '../../src/common/enums/status.enum';

export async function seedUnitMotor(
  prisma: PrismaClient,
  jenisMotor: JenisMotorType[],
): Promise<UnitMotorType[]> {
  const unitMotorData = [
    // Honda Beat (Jenis Motor 0)
    {
      jenisId: jenisMotor[0].id,
      platNomor: 'AB 1234 CD',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[0].id,
      platNomor: 'AB 2345 CD',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[0].id,
      platNomor: 'AB 1122 EF',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[0].id,
      platNomor: 'AB 3344 EF',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[0].id,
      platNomor: 'AB 5566 EF',
      hargaSewa: new Decimal(75000),
      status: StatusMotor.TERSEDIA,
    },

    // Yamaha NMAX (Jenis Motor 1)
    {
      jenisId: jenisMotor[1].id,
      platNomor: 'AB 3456 CD',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[1].id,
      platNomor: 'AB 7788 FG',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[1].id,
      platNomor: 'AB 9900 FG',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[1].id,
      platNomor: 'AB 1212 HI',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },

    // Honda PCX (Jenis Motor 2)
    {
      jenisId: jenisMotor[2].id,
      platNomor: 'AB 4567 CD',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[2].id,
      platNomor: 'AB 3434 HI',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[2].id,
      platNomor: 'AB 5656 HI',
      hargaSewa: new Decimal(125000),
      status: StatusMotor.TERSEDIA,
    },

    // Vespa Sprint (Jenis Motor 3)
    {
      jenisId: jenisMotor[3].id,
      platNomor: 'AB 5678 CD',
      hargaSewa: new Decimal(150000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[3].id,
      platNomor: 'AB 7878 JK',
      hargaSewa: new Decimal(150000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[3].id,
      platNomor: 'AB 9090 JK',
      hargaSewa: new Decimal(150000),
      status: StatusMotor.TERSEDIA,
    },

    // Kawasaki Ninja 250 (Jenis Motor 4)
    {
      jenisId: jenisMotor[4].id,
      platNomor: 'AB 6789 CD',
      hargaSewa: new Decimal(200000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[4].id,
      platNomor: 'AB 2323 LM',
      hargaSewa: new Decimal(200000),
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[4].id,
      platNomor: 'AB 4545 LM',
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
