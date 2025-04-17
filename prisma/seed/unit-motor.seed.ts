import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JenisMotorType, UnitMotorType } from './types';
import { StatusMotor } from '../../src/common/enums/status.enum';

function generateSlug(jenisMotor: JenisMotorType, platNomor: string): string {
  // Gunakan slug dari jenis motor dan plat nomor yang disanitasi
  const sanitizedPlat = platNomor.replaceAll(/\s+/g, '');
  return `${jenisMotor.slug}-${sanitizedPlat}`;
}

export async function seedUnitMotor(
  prisma: PrismaClient,
  jenisMotor: JenisMotorType[],
): Promise<UnitMotorType[]> {
  // Mendapatkan indeks jenis motor berdasarkan model
  const getJenisIndex = (model: string): number => {
    return jenisMotor.findIndex(jm => jm.model.toLowerCase() === model.toLowerCase());
  };

  // Indeks model motor
  const beatFlIndex = getJenisIndex('Beat Fi');
  const scoopyIndex = getJenisIndex('Scoopy');
  const vario125Index = getJenisIndex('Vario 125');
  const vario150Index = getJenisIndex('Vario 150');
  const lexiIndex = getJenisIndex('Lexi');
  const soulGTIndex = getJenisIndex('Soul GT');
  const pcxIndex = getJenisIndex('PCX');

  const unitMotorData = [
    // Honda Beat FL
    {
      jenisId: jenisMotor[beatFlIndex].id,
      platNomor: 'N 2045 ADK',
      hargaSewa: '100000',
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[beatFlIndex].id,
      platNomor: 'N 5828 ADF',
      hargaSewa: '100000',
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[beatFlIndex].id,
      platNomor: 'N 5986 ADH',
      hargaSewa: '100000',
      status: StatusMotor.TERSEDIA,
    },

    // Honda Scoopy
    {
      jenisId: jenisMotor[scoopyIndex].id,
      platNomor: 'N 6393 EDN',
      hargaSewa: '100000',
      status: StatusMotor.TERSEDIA,
    },

    // Honda Vario 125
    {
      jenisId: jenisMotor[vario125Index].id,
      platNomor: 'N 2238 ABV',
      hargaSewa: '120000',
      status: StatusMotor.TERSEDIA,
    },

    // Honda Vario 150
    {
      jenisId: jenisMotor[vario150Index].id,
      platNomor: 'N 3561 AAV',
      hargaSewa: '120000',
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[vario150Index].id,
      platNomor: 'N 3317 BAZ',
      hargaSewa: '120000',
      status: StatusMotor.TERSEDIA,
    },

    // Yamaha Lexi
    {
      jenisId: jenisMotor[lexiIndex].id,
      platNomor: 'N 5622 ABO',
      hargaSewa: '125000',
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[lexiIndex].id,
      platNomor: 'N 5644 ABO',
      hargaSewa: '125000',
      status: StatusMotor.TERSEDIA,
    },
    {
      jenisId: jenisMotor[lexiIndex].id,
      platNomor: 'N 2711 ABP',
      hargaSewa: '125000',
      status: StatusMotor.TERSEDIA,
    },

    // Yamaha Soul GT
    {
      jenisId: jenisMotor[soulGTIndex].id,
      platNomor: 'N 5993 ADJ',
      hargaSewa: '80000',
      status: StatusMotor.TERSEDIA,
    },

    // Honda PCX
    {
      jenisId: jenisMotor[pcxIndex].id,
      platNomor: 'N 2603 ACA',
      hargaSewa: '150000',
      status: StatusMotor.TERSEDIA,
    },
  ];

  const unitMotor: UnitMotorType[] = [];
  for (const data of unitMotorData) {
    // Cek apakah unit motor sudah ada
    const existingUnit = await prisma.unitMotor.findUnique({
      where: { platNomor: data.platNomor },
    });

    // Dapatkan jenis motor terkait
    const relatedJenisMotor = jenisMotor.find(jm => jm.id === data.jenisId);
    if (!relatedJenisMotor) {
      console.error(`Jenis motor dengan ID ${data.jenisId} tidak ditemukan.`);
      continue;
    }

    // Generate slug dari jenis motor dan plat nomor
    const slug = generateSlug(relatedJenisMotor, data.platNomor);

    if (existingUnit) {
      console.log(`Unit motor ${data.platNomor} sudah ada`);
      
      // Update slug jika belum ada
      if (!existingUnit.slug) {
        await prisma.unitMotor.update({
          where: { id: existingUnit.id },
          data: { slug }
        });
        console.log(`Slug untuk unit motor ${data.platNomor} telah diperbarui menjadi ${slug}`);
      }
      
      unitMotor.push(existingUnit);
    } else {
      const unit = await prisma.unitMotor.create({
        data: {
          jenisId: data.jenisId,
          platNomor: data.platNomor,
          hargaSewa: new Decimal(data.hargaSewa),
          status: data.status,
          slug: slug,
        },
      });
      unitMotor.push(unit);
      console.log(`Unit motor ${unit.platNomor} berhasil dibuat dengan slug ${unit.slug}`);
    }
  }
  return unitMotor;
}
