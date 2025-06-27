import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Logger } from '@nestjs/common';
import { handleError } from '../../../common/helpers';
import { CreateBlogTagDto, UpdateBlogTagDto } from '../dto';

@ApiTags('Blog Tag')
@Controller('blog/tags')
export class BlogTagController {
  private readonly logger = new Logger(BlogTagController.name);

  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua tag blog' })
  @ApiResponse({ status: 200, description: 'Daftar tag berhasil diambil' })
  async getTags() {
    try {
      const tags = await this.blogService.findAllTags();
      return {
        data: tags,
        message: 'Daftar tag berhasil diambil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar tag');
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Mencari tag blog berdasarkan query' })
  @ApiResponse({ status: 200, description: 'Hasil pencarian tag' })
  async searchTags(@Query('q') query: string) {
    try {
      const tags = await this.blogService.searchTags(query || '');
      return {
        data: tags,
        message: 'Pencarian tag berhasil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari tag');
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Membuat tag baru' })
  @ApiResponse({ status: 201, description: 'Tag berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  async createTag(@Body() createTagDto: CreateBlogTagDto) {
    try {
      // Implementasi pembuatan tag akan ditambahkan di BlogService
      const tag = await this.blogService.createTag(createTagDto);
      return {
        data: tag,
        message: 'Tag berhasil dibuat',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat tag');
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Memperbarui tag berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Tag berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Tag tidak ditemukan' })
  async updateTag(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateBlogTagDto,
  ) {
    try {
      // Implementasi pembaruan tag akan ditambahkan di BlogService
      const tag = await this.blogService.updateTag(id, updateTagDto);
      return {
        data: tag,
        message: 'Tag berhasil diperbarui',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui tag dengan ID ${id}`);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Menghapus tag berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Tag berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Tag tidak ditemukan' })
  async deleteTag(@Param('id') id: string) {
    try {
      // Implementasi penghapusan tag akan ditambahkan di BlogService
      await this.blogService.deleteTag(id);
      return {
        message: 'Tag berhasil dihapus',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus tag dengan ID ${id}`);
    }
  }
} 