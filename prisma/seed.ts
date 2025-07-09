import { PrismaClient } from '@prisma/client';
import {
  seedAdmin,
  seedJenisMotor,
  seedUnitMotor,
  seedTransaksi,
  seedBlogTags,
  seedBlogPosts,
} from './seed/index';
// import { seedBlogPosts } from './seed/blog.seed';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Memulai proses seed database...');

    
    const admin = await seedAdmin(prisma);
    console.log(`${admin.length} admin telah di-seed`);

    
    const jenisMotor = await seedJenisMotor(prisma);
    console.log(`${jenisMotor.length} jenis motor telah di-seed`);

    
    const unitMotor = await seedUnitMotor(prisma, jenisMotor);
    console.log(`${unitMotor.length} unit motor telah di-seed`);

    
    const transaksi = await seedTransaksi(prisma, unitMotor);
    console.log(`${transaksi.length} transaksi telah di-seed`);

    
    const blogTags = await seedBlogTags(prisma);
    console.log(`${blogTags.length} tags blog telah di-seed`);

    
    const blogPosts = await seedBlogPosts(prisma, blogTags);
    console.log(`${blogPosts.length} artikel blog telah di-seed`);

    console.log('Proses seed database selesai.');
  } catch (error) {
    console.error('Terjadi kesalahan pada proses seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
