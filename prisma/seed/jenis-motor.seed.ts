import type { PrismaClient } from '@prisma/client';
import type { JenisMotorType } from './types';


export async function seedJenisMotor(prisma: PrismaClient): Promise<JenisMotorType[]> {
  const jenisMotorData = [
    {
      merk: 'Honda',
      model: 'Beat Fi',
      cc: 110,
      slug: 'honda-beat-fi',
      gambar: 'https://rosantibikemotorent.com/uploads/beat-fi-110-2024-1.jpg',
    },
    {
      merk: 'Honda',
      model: 'Scoopy',
      cc: 110,
      slug: 'honda-scoopy',
      gambar: 'https://rosantibikemotorent.com/uploads/scoopy-110-2024-1.jpg',
    },
    {
      merk: 'Honda',
      model: 'Vario 125',
      cc: 125,
      slug: 'honda-vario-125',
      gambar: 'https://rosantibikemotorent.com/uploads/vario-125-2024-1.jpg',
    },
    {
      merk: 'Honda',
      model: 'Vario 150',
      cc: 150,
      slug: 'honda-vario-150',
      gambar: 'https://rosantibikemotorent.com/uploads/vario-150-2024-1.jpg',
    },
    {
      merk: 'Yamaha',
      model: 'Lexi',
      cc: 125,
      slug: 'yamaha-lexi',
      gambar: 'https://rosantibikemotorent.com/uploads/lexi-125-2024-1.jpg',
    },
    {
      merk: 'Yamaha',
      model: 'Soul GT',
      cc: 125,
      slug: 'yamaha-soul-gt',
      gambar: 'https://rosantibikemotorent.com/uploads/soul-gt-125-2024-1.jpg',
    },
    {
      merk: 'Honda',
      model: 'PCX',
      cc: 150,
      slug: 'honda-pcx',
      gambar: 'https://rosantibikemotorent.com/uploads/pcx-150-2024-1.jpg',
    },
  ];

  const jenisMotor: JenisMotorType[] = [];
  for (const data of jenisMotorData) {
    
    const existingJenis = await prisma.jenisMotor.findFirst({
      where: {
        merk: data.merk,
        model: data.model,
      },
    });

    if (existingJenis) {
      console.log(`Jenis motor ${data.merk} ${data.model} sudah ada`);
      
      
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
