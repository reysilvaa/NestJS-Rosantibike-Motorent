import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WhatsappQueue } from '../../whatsapp/queues/whatsapp.queue';

@Processor('blog')
export class BlogProcessor extends WorkerHost {
  private readonly logger = new Logger(BlogProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsappQueue: WhatsappQueue,
  ) {
    super();
    this.logger.log('BlogProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job: ${job.id}, name: ${job.name}`);

    switch (job.name) {
      case 'create-blog': {
        return this.handleCreateBlog(job);
      }
      case 'process-image': {
        return this.handleProcessImage(job);
      }
      case 'broadcast-blog': {
        return this.handleBroadcastBlog(job);
      }
      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }

  private async handleCreateBlog(job: Job<{ blogData: any }>) {
    this.logger.debug(`Processing create blog job: ${job.id}`);

    try {
      const { blogData } = job.data;

      // Generate slug jika belum ada
      if (!blogData.slug) {
        blogData.slug = this.generateSlug(blogData.judul);
      }

      // Simpan blog ke database
      const blog = await this.prisma.blogPost.create({
        data: {
          judul: blogData.judul,
          slug: blogData.slug,
          konten: blogData.konten,
          thumbnail: blogData.thumbnail || null,
          kategori: blogData.kategori || 'Umum',
          status: blogData.status || 'DRAFT',
        },
      });

      this.logger.debug(`Blog created successfully: ${blog.id}`);
      return blog;
    } catch (error) {
      this.logger.error(`Failed to create blog: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleProcessImage(job: Job<{ blogId: string; imageData: any }>) {
    this.logger.debug(`Processing image for blog: ${job.data.blogId}`);

    try {
      const { blogId, imageData } = job.data;

      // Simulasi processing gambar (resize, compress, etc.)
      this.logger.debug('Processing image...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulasi waktu

      // Update blog dengan URL gambar baru
      const processedImageUrl = imageData.url.replaceAll('/original/', '/processed/');

      // Update blog
      const updatedBlog = await this.prisma.blogPost.update({
        where: { id: blogId },
        data: { thumbnail: processedImageUrl },
      });

      this.logger.debug(`Image processed successfully for blog: ${blogId}`);
      return updatedBlog;
    } catch (error) {
      this.logger.error(`Failed to process image: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleBroadcastBlog(job: Job<{ blogId: string }>) {
    this.logger.debug(`Processing broadcast blog job: ${job.id}`);

    try {
      const { blogId } = job.data;

      // Dapatkan blog dari database
      const blog = await this.prisma.blogPost.findUnique({
        where: { id: blogId },
      });

      if (!blog) {
        throw new Error(`Blog dengan ID ${blogId} tidak ditemukan`);
      }

      // Ambil semua pelanggan yang subscribe ke newsletter
      const subscribers = await this.prisma.transaksiSewa.findMany({
        distinct: ['noWhatsapp'],
        select: { noWhatsapp: true },
      });

      // Persiapkan pesan broadcast
      const message = `*Blog Baru!*\n\n${blog.judul}\n\nKunjungi website kami untuk membaca artikel lengkapnya.\n\nhttps://rental-motor.com/blog/${blog.slug}`;

      // Dapatkan semua nomor telepon
      const recipients = subscribers.map(s => s.noWhatsapp);

      if (recipients.length > 0) {
        // Kirim broadcast via WhatsApp queue
        await this.whatsappQueue.addBroadcastJob(recipients, message);
      }

      this.logger.debug(`Blog broadcast scheduled to ${recipients.length} recipients`);
      return { success: true, recipientsCount: recipients.length };
    } catch (error) {
      this.logger.error(`Failed to broadcast blog: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replaceAll(/[^\s\w-]/g, '') // Hapus karakter spesial
      .replaceAll(/\s+/g, '-') // Ganti spasi dengan -
      .replaceAll(/-+/g, '-') // Ganti multiple - dengan single -
      .trim();
  }
}
