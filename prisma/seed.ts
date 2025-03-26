import { PrismaClient } from '@prisma/client';
import {
  seedAdmin,
  seedJenisMotor,
  seedUnitMotor,
  seedTransaksi,
  seedBlogTags,
} from './seed/index';
import * as bcrypt from 'bcrypt';
import { seedBlogPosts } from './seed/blog.seed';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Memulai proses seed database...');

    // Seed admin
    const admin = await seedAdmin(prisma);
    console.log(`${admin.length} admin telah di-seed`);

    // Seed jenis motor
    const jenisMotor = await seedJenisMotor(prisma);
    console.log(`${jenisMotor.length} jenis motor telah di-seed`);

    // Seed unit motor
    const unitMotor = await seedUnitMotor(prisma, jenisMotor);
    console.log(`${unitMotor.length} unit motor telah di-seed`);

    // Seed transaksi
    const transaksi = await seedTransaksi(prisma, unitMotor);
    console.log(`${transaksi.length} transaksi telah di-seed`);

    // Seed blog tags
    const blogTags = await seedBlogTags(prisma);
    console.log(`${blogTags.length} tags blog telah di-seed`);

    // Seed blog posts
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
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
