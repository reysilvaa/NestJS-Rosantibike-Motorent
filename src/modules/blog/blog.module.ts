import { Module } from '@nestjs/common';
import { BlogController } from './controllers/blog.controller';
import { BlogKategoriController } from './controllers/blog-kategori.controller';
import { BlogTagController } from './controllers/blog-tag.controller';
import { BlogService } from './services/blog.service';
import { BlogKategoriService } from './services/blog-kategori.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CloudinaryModule } from '../../common/services/cloudinary.module';
import { BullModule } from '@nestjs/bullmq';
import { BlogQueue } from './queues/blog.queue';
import { BlogProcessor } from './processors/blog.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'blog',
    }),
  ],
  controllers: [BlogController, BlogKategoriController, BlogTagController],
  providers: [BlogService, BlogKategoriService, BlogQueue, BlogProcessor],
  exports: [BlogService, BlogKategoriService, BlogQueue],
})
export class BlogModule {}
