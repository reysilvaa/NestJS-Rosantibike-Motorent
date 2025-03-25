import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateBlogPostDto, UpdateBlogPostDto, FilterBlogPostDto } from '../dto';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Dapatkan semua artikel' })
  @ApiResponse({ status: 200, description: 'Daftar artikel berhasil diambil' })
  async findAll(@Query() filter: FilterBlogPostDto) {
    return this.blogService.findAll(filter);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Dapatkan artikel berdasarkan slug' })
  @ApiResponse({ status: 200, description: 'Artikel berhasil diambil' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buat artikel baru' })
  @ApiResponse({ status: 201, description: 'Artikel berhasil dibuat' })
  async create(@Body() data: CreateBlogPostDto) {
    return this.blogService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update artikel' })
  @ApiResponse({ status: 200, description: 'Artikel berhasil diupdate' })
  async update(@Param('id') id: string, @Body() data: UpdateBlogPostDto) {
    return this.blogService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hapus artikel' })
  @ApiResponse({ status: 200, description: 'Artikel berhasil dihapus' })
  async delete(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
