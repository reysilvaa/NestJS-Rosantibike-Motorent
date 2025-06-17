import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { CreateBlogPostDto, UpdateBlogPostDto } from '../dto';
import {
  verifyBlogPostExists,
  verifyBlogPostBySlugExists,
  verifySlugIsUnique,
  transformBlogPostForFrontend,
} from '../helpers';
import { handleError } from '../../../common/helpers';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 10, search = '', category = '' } = query;

    // Build where condition
    const where = {};
    if (search) {
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where['category'] = category;
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: parseInt(skip.toString()),
        take: parseInt(limit.toString()),
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    try {
      return await verifyBlogPostExists(id, this.prisma, this.logger);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil detail artikel dengan ID ${id}`);
    }
  }

  async findBySlug(slug: string) {
    try {
      const post = await verifyBlogPostBySlugExists(slug, this.prisma, this.logger);
      return transformBlogPostForFrontend(post);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil artikel dengan slug ${slug}`);
    }
  }

  async create(createBlogPostDto: CreateBlogPostDto) {
    try {
      // Periksa apakah slug sudah digunakan
      if (createBlogPostDto.slug) {
        await verifySlugIsUnique(createBlogPostDto.slug, this.prisma);
      }

      return await this.prisma.$transaction(async tx => {
        // Proses tags - buat tag baru jika belum ada
        let tagConnections: { tag: { connect: { id: string } } }[] = [];

        if (createBlogPostDto.tags && Array.isArray(createBlogPostDto.tags)) {
          // Untuk setiap tag, cek apakah sudah ada di database
          // Jika belum, buat tag baru
          const tagPromises = createBlogPostDto.tags.map(async tagName => {
            // Konversi nama tag ke lowercase untuk konsistensi
            const normalizedTagName = tagName.trim().toLowerCase();
            
            // Cari tag berdasarkan nama (lowercase)
            let tag = await tx.blogTag.findFirst({
              where: { nama: normalizedTagName },
            });
            
            // Jika tag belum ada, buat baru
            if (!tag && normalizedTagName) {
              tag = await tx.blogTag.create({
                data: { nama: normalizedTagName },
              });
            }

            // Jika tag valid, tambahkan ke koneksi
            if (tag) {
              return { tag: { connect: { id: tag.id } } };
            }
            return null;
          });

          // Tunggu semua promise selesai
          const resolvedTags = await Promise.all(tagPromises);
          // Filter null values
          tagConnections = resolvedTags.filter(t => t !== null);
        }

        // Buat artikel
        const post = await tx.blogPost.create({
          data: {
            judul: createBlogPostDto.judul,
            konten: createBlogPostDto.konten,
            slug: createBlogPostDto.slug || '',
            thumbnail: createBlogPostDto.featuredImage || '',
            kategori: 'UMUM',
            status: createBlogPostDto.status,
            tags: {
              create: tagConnections,
            },
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        return post;
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat artikel blog');
    }
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    try {
      // Periksa apakah artikel ada
      const existingPost = await verifyBlogPostExists(id, this.prisma, this.logger);

      // Jika mengubah slug, periksa apakah sudah digunakan
      if (updateBlogPostDto.slug && updateBlogPostDto.slug !== existingPost.slug) {
        await verifySlugIsUnique(updateBlogPostDto.slug, this.prisma, id);
      }

      return await this.prisma.$transaction(async tx => {
        // Proses tags jika ada
        let tagConnections: { tag: { connect: { id: string } } }[] = [];

        if (updateBlogPostDto.tags && Array.isArray(updateBlogPostDto.tags)) {
          // Untuk setiap tag, cek apakah sudah ada di database
          // Jika belum, buat tag baru
          const tagPromises = updateBlogPostDto.tags.map(async tagName => {
            // Konversi nama tag ke lowercase untuk konsistensi
            const normalizedTagName = tagName.trim().toLowerCase();
            
            // Cari tag berdasarkan nama (lowercase)
            let tag = await tx.blogTag.findFirst({
              where: { nama: normalizedTagName },
            });
            
            // Jika tag belum ada, buat baru
            if (!tag && normalizedTagName) {
              tag = await tx.blogTag.create({
                data: { nama: normalizedTagName },
              });
            }

            // Jika tag valid, tambahkan ke koneksi
            if (tag) {
              return { tag: { connect: { id: tag.id } } };
            }
            return null;
          });

          // Tunggu semua promise selesai
          const resolvedTags = await Promise.all(tagPromises);
          // Filter null values
          tagConnections = resolvedTags.filter(t => t !== null);
        }

        // Update artikel
        const post = await tx.blogPost.update({
          where: { id },
          data: {
            ...(updateBlogPostDto.judul && { judul: updateBlogPostDto.judul }),
            ...(updateBlogPostDto.konten && { konten: updateBlogPostDto.konten }),
            ...(updateBlogPostDto.slug && { slug: updateBlogPostDto.slug }),
            ...(updateBlogPostDto.featuredImage && { thumbnail: updateBlogPostDto.featuredImage }),
            ...(updateBlogPostDto.status && { status: updateBlogPostDto.status }),
            ...(updateBlogPostDto.tags && {
              tags: {
                deleteMany: {},
                create: tagConnections,
              },
            }),
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        return post;
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui artikel dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      // Verifikasi keberadaan artikel
      await verifyBlogPostExists(id, this.prisma, this.logger);

      return await this.prisma.$transaction(async tx => {
        // Hapus relasi tag
        await tx.blogPostTag.deleteMany({
          where: { postId: id },
        });

        // Hapus artikel
        return tx.blogPost.delete({
          where: { id },
        });
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus artikel dengan ID ${id}`);
    }
  }

  async findAllTags() {
    try {
      return await this.prisma.blogTag.findMany({
        orderBy: {
          nama: 'asc'
        }
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar tag');
    }
  }
  
  async searchTags(query: string) {
    try {
      return await this.prisma.blogTag.findMany({
        where: {
          nama: {
            contains: query.toLowerCase(),
            mode: 'insensitive'
          }
        },
        orderBy: {
          nama: 'asc'
        },
        take: 10
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari tag');
    }
  }
}
