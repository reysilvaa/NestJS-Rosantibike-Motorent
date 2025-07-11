import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/modules/prisma/services/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nama: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByUsername(username: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });
    return admin;
  }

  async create(data: { username: string; password: string; nama: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, data: { username?: string; password?: string; nama?: string }) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.admin.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.admin.delete({
      where: { id },
    });
  }
}
