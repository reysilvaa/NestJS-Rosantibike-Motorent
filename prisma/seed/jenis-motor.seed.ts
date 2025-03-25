import type { PrismaClient } from '@prisma/client';
import type { JenisMotorType } from './types';

export async function seedJenisMotor(prisma: PrismaClient): Promise<JenisMotorType[]> {
  const jenisMotorData = [
    {
      merk: 'Honda',
      model: 'Beat',
      cc: 110,
    },
    {
      merk: 'Yamaha',
      model: 'NMAX',
      cc: 155,
    },
    {
      merk: 'Honda',
      model: 'PCX',
      cc: 150,
    },
    {
      merk: 'Vespa',
      model: 'Sprint',
      cc: 150,
    },
    {
      merk: 'Kawasaki',
      model: 'Ninja 250',
      cc: 250,
    },
  ];

  const jenisMotor: JenisMotorType[] = [];
  for (const data of jenisMotorData) {
    // Cek apakah jenis motor sudah ada
    const existingJenis = await prisma.jenisMotor.findFirst({
      where: {
        merk: data.merk,
        model: data.model,
      },
    });

    if (existingJenis) {
      console.log(`Jenis motor ${data.merk} ${data.model} sudah ada`);
      jenisMotor.push(existingJenis as JenisMotorType);
    } else {
      const jenis = await prisma.jenisMotor.create({ data });
      jenisMotor.push(jenis as JenisMotorType);
      console.log(`Jenis motor ${jenis.merk} ${jenis.model} berhasil dibuat`);
    }
  }
  return jenisMotor;
}
