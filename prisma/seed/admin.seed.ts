import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AdminType } from './types';

export async function seedAdmin(prisma: PrismaClient): Promise<AdminType[]> {
  const adminData = [
    {
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      nama: 'Administrator',
    },
    {
      username: 'operator',
      password: await bcrypt.hash('operator123', 10),
      nama: 'Operator Rental',
    },
  ];

  const admins: AdminType[] = [];
  for (const data of adminData) {
    // Cek apakah admin sudah ada
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: data.username },
    });

    if (existingAdmin) {
      console.log(`Admin ${data.username} sudah ada, tidak perlu dibuat lagi`);
      admins.push(existingAdmin as AdminType);
    } else {
      const admin = await prisma.admin.create({ data });
      admins.push(admin as AdminType);
      console.log(`Admin ${admin.username} berhasil dibuat`);
    }
  }
  return admins;
}
