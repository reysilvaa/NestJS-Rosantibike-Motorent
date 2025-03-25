import { Module } from '@nestjs/common';
import { BlogService } from './services/blog.service';
import { BlogController } from './controllers/blog.controller';
import { PrismaModule } from '../../common';

@Module({
  imports: [PrismaModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
