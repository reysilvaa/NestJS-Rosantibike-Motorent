import type { PrismaClient } from '@prisma/client';
import type { JenisMotorType } from './types';

// Fungsi untuk menghasilkan slug dari merk dan model
function generateSlug(merk: string, model: string): string {
  const merkSlug = merk.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
  const modelSlug = model.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
  return `${merkSlug}-${modelSlug}`;
}

export async function seedJenisMotor(prisma: PrismaClient): Promise<JenisMotorType[]> {
  const jenisMotorData = [
    {
      merk: 'Honda',
      model: 'Beat',
      cc: 110,
      slug: 'honda-beat',
    },
    {
      merk: 'Yamaha',
      model: 'NMAX',
      cc: 155,
      slug: 'yamaha-nmax',
    },
    {
      merk: 'Honda',
      model: 'PCX',
      cc: 150,
      slug: 'honda-pcx',
    },
    {
      merk: 'Vespa',
      model: 'Sprint',
      cc: 150,
      slug: 'vespa-sprint',
    },
    {
      merk: 'Kawasaki',
      model: 'Ninja 250',
      cc: 250,
      slug: 'kawasaki-ninja-250',
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
      
      // Update slug jika belum ada
      if (!existingJenis.slug) {
        await prisma.jenisMotor.update({
          where: { id: existingJenis.id },
          data: { slug: data.slug }
        });
        console.log(`Slug untuk ${data.merk} ${data.model} telah diperbarui menjadi ${data.slug}`);
      }
      
      jenisMotor.push(existingJenis as JenisMotorType);
    } else {
      const jenis = await prisma.jenisMotor.create({ data });
      jenisMotor.push(jenis as JenisMotorType);
      console.log(`Jenis motor ${jenis.merk} ${jenis.model} berhasil dibuat dengan slug ${jenis.slug}`);
    }
  }
  return jenisMotor;
}
