import type { PrismaClient } from '@prisma/client';
import type { JenisMotorType } from './types';

// Fungsi untuk menghasilkan slug dari merk dan model
export async function seedJenisMotor(prisma: PrismaClient): Promise<JenisMotorType[]> {
  const jenisMotorData = [
    {
      merk: 'Honda',
      model: 'Beat Fi',
      cc: 110,
      slug: 'honda-beat-fi',
      gambar: 'beat-fi.jpg',
    },
    {
      merk: 'Honda',
      model: 'Scoopy',
      cc: 110,
      slug: 'honda-scoopy',
      gambar: 'scoopy.jpg',
    },
    {
      merk: 'Honda',
      model: 'Vario 125',
      cc: 125,
      slug: 'honda-vario-125',
      gambar: 'vario-125.jpg',
    },
    {
      merk: 'Honda',
      model: 'Vario 150',
      cc: 150,
      slug: 'honda-vario-150',
      gambar: 'vario-150.jpg',
    },
    {
      merk: 'Yamaha',
      model: 'Lexi',
      cc: 125,
      slug: 'yamaha-lexi',
      gambar: 'maxi-lexi.jpg',
    },
    {
      merk: 'Yamaha',
      model: 'Soul GT',
      cc: 125,
      slug: 'yamaha-soul-gt',
      gambar: 'soul-gt.jpg',
    },
    {
      merk: 'Honda',
      model: 'PCX',
      cc: 150,
      slug: 'honda-pcx',
      gambar: 'pcx.jpg',
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
          data: { 
            slug: data.slug,
            gambar: data.gambar
          }
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
