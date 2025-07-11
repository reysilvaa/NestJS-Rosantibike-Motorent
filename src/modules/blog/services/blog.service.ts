import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    const { page = 1, limit = 10, search = '', category = '', tag = '' } = query;

    const where: any = {};
    if (search) {
      where['OR'] = [
        { judul: { contains: search, mode: 'insensitive' } },
        { konten: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where['kategori'] = {
        slug: category,
      };
    }

    if (tag) {
      where['tags'] = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        include: {
          kategori: true,
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

    // Transform data untuk frontend
    const transformedData = data.map(post => ({
      ...post,
      tags: post.tags.map(t => ({
        id: t.tag.id,
        nama: t.tag.nama,
        slug: t.tag.slug,
      })),
    }));

    return {
      data: transformedData,
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
      const post = await verifyBlogPostExists(id, this.prisma, this.logger);
      return {
        ...post,
        tags: post.tags.map(t => ({
          id: t.tag.id,
          nama: t.tag.nama,
          slug: t.tag.slug,
        })),
      };
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
      if (createBlogPostDto.slug) {
        await verifySlugIsUnique(createBlogPostDto.slug, this.prisma);
      }

      return await this.prisma.$transaction(async tx => {
        let tagConnections: { tag: { connect: { id: string } } }[] = [];

        if (createBlogPostDto.tags && Array.isArray(createBlogPostDto.tags)) {
          const tagPromises = createBlogPostDto.tags.map(async tagName => {
            const normalizedTagName = tagName.trim().toLowerCase();

            let tag = await tx.blogTag.findFirst({
              where: { nama: normalizedTagName },
            });

            if (!tag && normalizedTagName) {
              // Generate slug untuk tag baru
              const tagSlug = normalizedTagName
                .toLowerCase()
                .replaceAll(/[^\da-z]+/g, '-')
                .replaceAll(/(^-|-$)/g, '');

              tag = await tx.blogTag.create({
                data: { 
                  nama: normalizedTagName,
                  slug: tagSlug
                },
              });
            }

            if (tag) {
              return { tag: { connect: { id: tag.id } } };
            }
            return null;
          });

          const resolvedTags = await Promise.all(tagPromises);

          tagConnections = resolvedTags.filter(t => t !== null);
        }

        const post = await tx.blogPost.create({
          data: {
            judul: createBlogPostDto.judul,
            konten: createBlogPostDto.konten,
            slug: createBlogPostDto.slug || '',
            thumbnail: createBlogPostDto.featuredImage || '',
            kategoriId: createBlogPostDto.kategoriId,
            status: createBlogPostDto.status,
            tags: {
              create: tagConnections,
            },
          },
          include: {
            kategori: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        return {
          ...post,
          tags: post.tags.map(t => ({
            id: t.tag.id,
            nama: t.tag.nama,
            slug: t.tag.slug,
          })),
        };
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat artikel blog');
    }
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    try {
      const existingPost = await verifyBlogPostExists(id, this.prisma, this.logger);

      if (updateBlogPostDto.slug && updateBlogPostDto.slug !== existingPost.slug) {
        await verifySlugIsUnique(updateBlogPostDto.slug, this.prisma, id);
      }

      return await this.prisma.$transaction(async tx => {
        let tagConnections: { tag: { connect: { id: string } } }[] = [];

        if (updateBlogPostDto.tags && Array.isArray(updateBlogPostDto.tags)) {
          const tagPromises = updateBlogPostDto.tags.map(async tagName => {
            const normalizedTagName = tagName.trim().toLowerCase();

            let tag = await tx.blogTag.findFirst({
              where: { nama: normalizedTagName },
            });

            if (!tag && normalizedTagName) {
              // Generate slug untuk tag baru
              const tagSlug = normalizedTagName
                .toLowerCase()
                .replaceAll(/[^\da-z]+/g, '-')
                .replaceAll(/(^-|-$)/g, '');

              tag = await tx.blogTag.create({
                data: { 
                  nama: normalizedTagName,
                  slug: tagSlug
                },
              });
            }

            if (tag) {
              return { tag: { connect: { id: tag.id } } };
            }
            return null;
          });

          const resolvedTags = await Promise.all(tagPromises);

          tagConnections = resolvedTags.filter(t => t !== null);
        }

        const post = await tx.blogPost.update({
          where: { id },
          data: {
            ...(updateBlogPostDto.judul && { judul: updateBlogPostDto.judul }),
            ...(updateBlogPostDto.konten && { konten: updateBlogPostDto.konten }),
            ...(updateBlogPostDto.slug && { slug: updateBlogPostDto.slug }),
            ...(updateBlogPostDto.featuredImage && { thumbnail: updateBlogPostDto.featuredImage }),
            ...(updateBlogPostDto.status && { status: updateBlogPostDto.status }),
            ...(updateBlogPostDto.metaTitle && { metaTitle: updateBlogPostDto.metaTitle }),
            ...(updateBlogPostDto.metaDescription && {
              metaDescription: updateBlogPostDto.metaDescription,
            }),
            ...(updateBlogPostDto.kategoriId && { kategoriId: updateBlogPostDto.kategoriId }),
            ...(updateBlogPostDto.tags && {
              tags: {
                deleteMany: {},
                create: tagConnections,
              },
            }),
          },
          include: {
            kategori: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        return {
          ...post,
          tags: post.tags.map(t => ({
            id: t.tag.id,
            nama: t.tag.nama,
            slug: t.tag.slug,
          })),
        };
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui artikel dengan ID ${id}`);
    }
  }

  async remove(id: string) {
    try {
      await verifyBlogPostExists(id, this.prisma, this.logger);

      return await this.prisma.$transaction(async tx => {
        await tx.blogPostTag.deleteMany({
          where: { postId: id },
        });

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
          nama: 'asc',
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar tag');
    }
  }

  async findAllKategori() {
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

  async searchTags(query: string) {
    try {
      return await this.prisma.blogTag.findMany({
        where: {
          nama: {
            contains: query.toLowerCase(),
            mode: 'insensitive',
          },
        },
        orderBy: {
          nama: 'asc',
        },
        take: 10,
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari tag');
    }
  }

  async createTag(createTagDto: { nama: string; slug?: string }) {
    try {
      const normalizedName = createTagDto.nama.trim().toLowerCase();
      
      // Cek apakah tag dengan nama yang sama sudah ada
      const existingTag = await this.prisma.blogTag.findFirst({
        where: { nama: normalizedName },
      });

      if (existingTag) {
        return existingTag;
      }

      // Generate slug jika tidak disediakan
      let slug = createTagDto.slug;
      if (!slug) {
        slug = normalizedName
          .toLowerCase()
          .replaceAll(/[^\da-z]+/g, '-')
          .replaceAll(/(^-|-$)/g, '');
      }

      // Cek keunikan slug
      const existingSlug = await this.prisma.blogTag.findFirst({
        where: { slug },
      });

      if (existingSlug) {
        // Tambahkan timestamp ke slug jika sudah ada
        slug = `${slug}-${Date.now()}`;
      }

      return await this.prisma.blogTag.create({
        data: {
          nama: normalizedName,
          slug,
        },
      });
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat tag');
    }
  }

  async updateTag(id: string, updateTagDto: { nama?: string; slug?: string }) {
    try {
      // Cek apakah tag ada
      const existingTag = await this.prisma.blogTag.findUnique({
        where: { id },
      });

      if (!existingTag) {
        throw new NotFoundException(`Tag dengan ID ${id} tidak ditemukan`);
      }

      const data: { nama?: string; slug?: string } = {};

      if (updateTagDto.nama) {
        const normalizedName = updateTagDto.nama.trim().toLowerCase();
        data.nama = normalizedName;
      }

      if (updateTagDto.slug) {
        data.slug = updateTagDto.slug;
      } else if (updateTagDto.nama && !updateTagDto.slug) {
        // Generate slug dari nama baru jika nama diubah tapi slug tidak
        data.slug = updateTagDto.nama
          .toLowerCase()
          .replaceAll(/[^\da-z]+/g, '-')
          .replaceAll(/(^-|-$)/g, '');
      }

      return await this.prisma.blogTag.update({
        where: { id },
        data,
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui tag dengan ID ${id}`);
    }
  }

  async deleteTag(id: string) {
    try {
      // Cek apakah tag ada
      const existingTag = await this.prisma.blogTag.findUnique({
        where: { id },
      });

      if (!existingTag) {
        throw new NotFoundException(`Tag dengan ID ${id} tidak ditemukan`);
      }

      // Hapus relasi tag dengan post terlebih dahulu
      await this.prisma.blogPostTag.deleteMany({
        where: { tagId: id },
      });

      // Hapus tag
      return await this.prisma.blogTag.delete({
        where: { id },
      });
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus tag dengan ID ${id}`);
    }
  }
}
