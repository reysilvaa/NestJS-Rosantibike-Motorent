import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/modules/prisma/services/prisma.service';
import type { CreateBlogKategoriDto, UpdateBlogKategoriDto } from '../dto';
import { handleError } from '../../../common/helpers';

@Injectable()
export class BlogKategoriService {
  private readonly logger = new Logger(BlogKategoriService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.blogKategori.findMany({
        orderBy: {
          nama: 'asc',
        },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar kategori');
    }
  }

  async findOne(id: string) {
    try {
      const kategori = await this.prisma.blogKategori.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (!kategori) {
        throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
      }

      return kategori;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil kategori dengan ID ${id}`);
    }
  }

  async findBySlug(slug: string) {
    try {
      const kategori = await this.prisma.blogKategori.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (!kategori) {
        throw new NotFoundException(`Kategori dengan slug ${slug} tidak ditemukan`);
      }

      return kategori;
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil kategori dengan slug ${slug}`);
    }
  }

  async create(createKategoriDto: CreateBlogKategoriDto) {
    try {
      // Cek apakah slug sudah ada
      if (createKategoriDto.slug) {
        const existingSlug = await this.prisma.blogKategori.findUnique({
          where: { slug: createKategoriDto.slug },
        });

        if (existingSlug) {
          createKategoriDto.slug = `${createKategoriDto.slug}-${Date.now()}`;
        }
      }

      return await this.prisma.blogKategori.create({
        data: {
          nama: createKategoriDto.nama,
          slug: createKategoriDto.slug || '',
          deskripsi: createKategoriDto.deskripsi,
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat kategori blog');
    }
  }

  async update(id: string, updateKategoriDto: UpdateBlogKategoriDto) {
    try {
      const kategori = await this.prisma.blogKategori.findUnique({
        where: { id },
      });

      if (!kategori) {
        throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
      }

      // Cek apakah slug sudah ada jika slug diubah
      if (updateKategoriDto.slug && updateKategoriDto.slug !== kategori.slug) {
        const existingSlug = await this.prisma.blogKategori.findUnique({
          where: { slug: updateKategoriDto.slug },
        });

        if (existingSlug && existingSlug.id !== id) {
          updateKategoriDto.slug = `${updateKategoriDto.slug}-${Date.now()}`;
        }
      }

      return await this.prisma.blogKategori.update({
        where: { id },
        data: {
          ...(updateKategoriDto.nama && { nama: updateKategoriDto.nama }),
          ...(updateKategoriDto.slug && { slug: updateKategoriDto.slug }),
          ...(updateKategoriDto.deskripsi !== undefined && {
            deskripsi: updateKategoriDto.deskripsi,
          }),
        },
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui kategori dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      const kategori = await this.prisma.blogKategori.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (!kategori) {
        throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
      }

      if (kategori._count.posts > 0) {
        throw new Error(
          `Tidak dapat menghapus kategori yang masih digunakan oleh ${kategori._count.posts} artikel`,
        );
      }

      return await this.prisma.blogKategori.delete({
        where: { id },
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus kategori dengan ID ${id}`);
    }
  }

  async search(query: string) {
    try {
      return await this.prisma.blogKategori.findMany({
        where: {
          OR: [
            {
              nama: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              deskripsi: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          nama: 'asc',
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari kategori');
    }
  }
}