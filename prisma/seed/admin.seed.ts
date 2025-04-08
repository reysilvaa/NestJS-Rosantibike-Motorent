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

  try {
    // Try to create all admins at once
    const result = await prisma.admin.createMany({
      data: adminData,
      skipDuplicates: false, // Skip if username already exists
    });

    console.log(`${result.count} admin berhasil dibuat`);

    // Return all admins from the database
    return await prisma.admin.findMany();
  } catch (error) {
    console.error('Error seeding admin:', error);
    return [];
  }
}
