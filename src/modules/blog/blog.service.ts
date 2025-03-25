import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBlogPostDto, UpdateBlogPostDto, FilterBlogPostDto } from './dto';
import { StatusArtikel } from '../../common/enums/status.enum';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterBlogPostDto) {
    const where = {
      ...(filter.status && { status: filter.status }),
      OR: filter.search
        ? [
            {
              judul: { contains: filter.search, mode: 'insensitive' as const },
            },
            {
              konten: { contains: filter.search, mode: 'insensitive' as const },
            },
          ]
        : undefined,
      tags: filter.tagId
        ? {
            some: {
              tagId: filter.tagId,
            },
          }
        : undefined,
    };

    // Hapus filter yang undefined
    Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Artikel dengan ID ${id} tidak ditemukan`);
    }

    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Artikel dengan slug ${slug} tidak ditemukan`);
    }

    return post;
  }

  async create(createBlogPostDto: CreateBlogPostDto) {
    // Periksa apakah slug sudah digunakan
    const existingPost = await this.prisma.blogPost.findUnique({
      where: { slug: createBlogPostDto.slug },
    });

    if (existingPost) {
      throw new BadRequestException(`Slug ${createBlogPostDto.slug} sudah digunakan`);
    }

    try {
      return await this.prisma.$transaction(async tx => {
        // Buat artikel
        const post = await tx.blogPost.create({
          data: {
            judul: createBlogPostDto.judul,
            konten: createBlogPostDto.konten,
            slug: createBlogPostDto.slug,
            thumbnail: createBlogPostDto.featuredImage,
            kategori: 'UMUM',
            status: createBlogPostDto.status,
            tags: {
              create: createBlogPostDto.tags?.map(tagId => ({
                tag: {
                  connect: { id: tagId },
                },
              })),
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(`Gagal membuat artikel: ${error.message}`);
      }
      throw new BadRequestException('Gagal membuat artikel');
    }
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    // Periksa apakah artikel ada
    const existingPost = await this.prisma.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw new NotFoundException(`Artikel dengan ID ${id} tidak ditemukan`);
    }

    // Jika mengubah slug, periksa apakah sudah digunakan
    if (updateBlogPostDto.slug && updateBlogPostDto.slug !== existingPost.slug) {
      const slugExists = await this.prisma.blogPost.findUnique({
        where: { slug: updateBlogPostDto.slug },
      });

      if (slugExists) {
        throw new BadRequestException(`Slug ${updateBlogPostDto.slug} sudah digunakan`);
      }
    }

    try {
      return await this.prisma.$transaction(async tx => {
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
                create: updateBlogPostDto.tags.map(tagId => ({
                  tag: {
                    connect: { id: tagId },
                  },
                })),
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(`Gagal memperbarui artikel: ${error.message}`);
      }
      throw new BadRequestException('Gagal memperbarui artikel');
    }
  }

  async remove(id: string) {
    try {
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(`Gagal menghapus artikel: ${error.message}`);
      }
      throw new BadRequestException('Gagal menghapus artikel');
    }
  }
}
