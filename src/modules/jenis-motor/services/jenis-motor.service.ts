import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';

@Injectable()
export class JenisMotorService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.jenisMotor.findMany({});
  }

  async findOne(id: string) {
    try {
      return await this.prisma.jenisMotor.findUnique({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Jenis motor dengan ID ${id} tidak ditemukan`);
    }
  }

  async create(createJenisMotorDto: CreateJenisMotorDto) {
    return this.prisma.jenisMotor.create({
      data: createJenisMotorDto,
    });
  }

  async update(id: string, updateJenisMotorDto: UpdateJenisMotorDto) {
    try {
      return await this.prisma.jenisMotor.update({
        where: { id },
        data: updateJenisMotorDto,
      });
    } catch {
      throw new NotFoundException(`Jenis motor dengan ID ${id} tidak ditemukan`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.jenisMotor.delete({
        where: { id },
      });
    } catch (_error) {
      throw new NotFoundException(`Jenis motor dengan ID ${id} tidak ditemukan`);
    }
  }
}
