import { Module } from '@nestjs/common';
import { BlogService } from './services/blog.service';
import { BlogController } from './controllers/blog.controller';
import { PrismaModule } from '../../common';
import { BullModule } from '@nestjs/bull';
import { BlogQueue } from './queues/blog.queue';
import { BlogProcessor } from './processors/blog.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'blog',
    }),
  ],
  controllers: [BlogController],
  providers: [BlogService, BlogQueue, BlogProcessor],
  exports: [BlogService, BlogQueue],
})
export class BlogModule {}
