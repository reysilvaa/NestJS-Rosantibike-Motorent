import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type { Logger } from '@nestjs/common';

export async function verifyBlogPostExists(id: string, prisma: PrismaService, logger: Logger) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        kategori: true,
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
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi artikel: ${error.message}`, error.stack);
    throw error;
  }
}

export async function verifyBlogPostBySlugExists(
  slug: string,
  prisma: PrismaService,
  logger: Logger,
) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        kategori: true,
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
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi artikel: ${error.message}`, error.stack);
    throw error;
  }
}

export async function verifySlugIsUnique(slug: string, prisma: PrismaService, excludeId?: string) {
  const existingPost = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (existingPost && (!excludeId || existingPost.id !== excludeId)) {
    throw new BadRequestException(`Slug ${slug} sudah digunakan`);
  }

  return true;
}

export async function verifyKategoriExists(id: string, prisma: PrismaService, logger: Logger) {
  try {
    const kategori = await prisma.blogKategori.findUnique({
      where: { id },
    });

    if (!kategori) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }

    return kategori;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi kategori: ${error.message}`, error.stack);
    throw error;
  }
}

export async function verifyKategoriSlugExists(
  slug: string,
  prisma: PrismaService,
  logger: Logger,
) {
  try {
    const kategori = await prisma.blogKategori.findUnique({
      where: { slug },
    });

    if (!kategori) {
      throw new NotFoundException(`Kategori dengan slug ${slug} tidak ditemukan`);
    }

    return kategori;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi kategori: ${error.message}`, error.stack);
    throw error;
  }
}

export async function verifyTagExists(id: string, prisma: PrismaService, logger: Logger) {
  try {
    const tag = await prisma.blogTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag dengan ID ${id} tidak ditemukan`);
    }

    return tag;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi tag: ${error.message}`, error.stack);
    throw error;
  }
}

export async function verifyTagSlugExists(slug: string, prisma: PrismaService, logger: Logger) {
  try {
    const tag = await prisma.blogTag.findUnique({
      where: { slug },
    });

    if (!tag) {
      throw new NotFoundException(`Tag dengan slug ${slug} tidak ditemukan`);
    }

    return tag;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    logger.error(`Gagal memverifikasi tag: ${error.message}`, error.stack);
    throw error;
  }
}
