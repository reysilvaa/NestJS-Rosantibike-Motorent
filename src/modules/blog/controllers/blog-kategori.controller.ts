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
import { BlogKategoriService } from '../services/blog-kategori.service';
import { CreateBlogKategoriDto, UpdateBlogKategoriDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Logger } from '@nestjs/common';
import { handleError } from '../../../common/helpers';

@ApiTags('Blog Kategori')
@Controller('blog/kategori')
export class BlogKategoriController {
  private readonly logger = new Logger(BlogKategoriController.name);

  constructor(private readonly blogKategoriService: BlogKategoriService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua kategori blog' })
  @ApiResponse({ status: 200, description: 'Daftar kategori berhasil diambil' })
  async getKategori() {
    try {
      const kategori = await this.blogKategoriService.findAll();
      return {
        data: kategori,
        message: 'Daftar kategori berhasil diambil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar kategori');
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Mencari kategori blog berdasarkan query' })
  @ApiResponse({ status: 200, description: 'Hasil pencarian kategori' })
  async searchKategori(@Query('q') query: string) {
    try {
      const kategori = await this.blogKategoriService.search(query || '');
      return {
        data: kategori,
        message: 'Pencarian kategori berhasil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari kategori');
    }
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Mendapatkan detail kategori berdasarkan slug' })
  @ApiResponse({ status: 200, description: 'Detail kategori berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan' })
  async getKategoriBySlug(@Param('slug') slug: string) {
    try {
      const kategori = await this.blogKategoriService.findBySlug(slug);
      return {
        data: kategori,
        message: 'Detail kategori berhasil diambil',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil kategori dengan slug ${slug}`);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail kategori berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail kategori berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan' })
  async getKategoriById(@Param('id') id: string) {
    try {
      const kategori = await this.blogKategoriService.findOne(id);
      return {
        data: kategori,
        message: 'Detail kategori berhasil diambil',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil kategori dengan ID ${id}`);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Membuat kategori baru' })
  @ApiResponse({ status: 201, description: 'Kategori berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  async createKategori(@Body() createKategoriDto: CreateBlogKategoriDto) {
    try {
      const kategori = await this.blogKategoriService.create(createKategoriDto);
      return {
        data: kategori,
        message: 'Kategori berhasil dibuat',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat kategori');
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Memperbarui kategori berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Kategori berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan' })
  async updateKategori(
    @Param('id') id: string,
    @Body() updateKategoriDto: UpdateBlogKategoriDto,
  ) {
    try {
      const kategori = await this.blogKategoriService.update(id, updateKategoriDto);
      return {
        data: kategori,
        message: 'Kategori berhasil diperbarui',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui kategori dengan ID ${id}`);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Menghapus kategori berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Kategori berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan' })
  async deleteKategori(@Param('id') id: string) {
    try {
      await this.blogKategoriService.remove(id);
      return {
        message: 'Kategori berhasil dihapus',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus kategori dengan ID ${id}`);
    }
  }
} 