import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type { Logger } from '@nestjs/common';

export async function verifyBlogPostExists(id: string, prisma: PrismaService, logger: Logger) {
  try {
    const post = await prisma.blogPost.findUnique({
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
