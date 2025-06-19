import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto, FilterBlogPostDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../../common/services';
import { memoryStorage } from 'multer';
import { Logger } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  createFileUploadInterceptor,
  getFirstFile,
  getFileInfo,
  handleError,
  logInfo,
  logRequestDebugInfo,
} from '../../../common/helpers';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  private readonly logger = new Logger(BlogController.name);

  constructor(
    private readonly blogService: BlogService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua blog dengan pagination' })
  @ApiResponse({ status: 200, description: 'Daftar blog berhasil diambil' })
  getBlogs(@Query() filter: FilterBlogPostDto) {
    return this.blogService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail blog berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail blog berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  getBlog(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @Get('/by-slug/:slug')
  @ApiOperation({ summary: 'Mendapatkan detail blog berdasarkan slug' })
  @ApiResponse({ status: 200, description: 'Detail blog berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  async getBlogBySlug(@Param('slug') slug: string) {
    try {
      const blog = await this.blogService.findBySlug(slug);
      return {
        data: blog,
        message: 'Blog post berhasil ditemukan',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil blog', 'getBlogBySlug');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Membuat blog baru (dengan atau tanpa gambar)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        gambar: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        judul: {
          type: 'string',
        },
        konten: {
          type: 'string',
        },
        slug: {
          type: 'string',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
        },
        kategori: {
          type: 'string',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        meta_description: {
          type: 'string',
        },
      },
      required: ['judul', 'konten'],
    },
  })
  @ApiResponse({ status: 201, description: 'Blog berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @UseInterceptors(createFileUploadInterceptor())
  async createBlog(
    @Body() createBlogDto: CreateBlogPostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      // Jika slug tidak disediakan, isi dengan slug dari judul
      if (!createBlogDto.slug && createBlogDto.judul) {
        createBlogDto.slug = createBlogDto.judul
          .toLowerCase()
          .replaceAll(/[^\da-z]+/g, '-')
          .replaceAll(/(^-|-$)/g, '');
      }

      // Jika ada file gambar, upload ke Cloudinary
      if (files && files.length > 0) {
        logInfo(this.logger, `Memproses pembuatan blog dengan gambar`);
        const file = getFirstFile(files, false);
        if (file) {
          logInfo(this.logger, getFileInfo(file));

          // Upload gambar ke Cloudinary
          logInfo(this.logger, 'Mengunggah gambar ke Cloudinary...');
          const gambarUrl = await this.cloudinaryService.uploadBlogImage(file);

          if (!gambarUrl) {
            throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
          }

          logInfo(this.logger, `Gambar berhasil diupload ke: ${gambarUrl}`);

          // Set thumbnail URL ke DTO
          createBlogDto.featuredImage = gambarUrl;
        }
      }

      // Buat blog dengan atau tanpa gambar
      const createdBlog = await this.blogService.create(createBlogDto);

      return {
        message: 'Blog berhasil dibuat' + (files && files.length > 0 ? ' dengan gambar' : ''),
        data: createdBlog,
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat blog', 'createBlog');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui blog berdasarkan ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        gambar: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'File gambar (opsional)',
        },
        judul: {
          type: 'string',
        },
        konten: {
          type: 'string',
        },
        slug: {
          type: 'string',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
        },
        kategori: {
          type: 'string',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        meta_description: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Blog berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  @UseInterceptors(createFileUploadInterceptor())
  async updateBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogPostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      // Dapatkan blog yang akan diupdate
      const blog = await this.blogService.findOne(id);

      if (!blog) {
        throw new NotFoundException(`Blog dengan ID "${id}" tidak ditemukan`);
      }

      // Jika ada file gambar baru, upload ke Cloudinary
      if (files && files.length > 0) {
        logInfo(this.logger, `Memproses update blog dengan gambar baru`);
        const file = getFirstFile(files, false);
        if (file) {
          logInfo(this.logger, getFileInfo(file));

          // Hapus gambar lama jika ada
          if (blog.thumbnail) {
            logInfo(this.logger, `Menghapus gambar lama: ${blog.thumbnail}`);
            await this.cloudinaryService.deleteFile(blog.thumbnail);
          }

          // Upload gambar baru ke Cloudinary
          logInfo(this.logger, 'Mengunggah gambar baru ke Cloudinary...');
          const gambarUrl = await this.cloudinaryService.uploadBlogImage(file);

          if (!gambarUrl) {
            throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
          }

          logInfo(this.logger, `Gambar baru berhasil diupload ke: ${gambarUrl}`);

          // Set thumbnail URL ke DTO
          updateBlogDto.featuredImage = gambarUrl;
        }
      }

      // Update blog
      const updated = await this.blogService.update(id, updateBlogDto);

      return {
        message:
          'Blog berhasil diperbarui' + (files && files.length > 0 ? ' dengan gambar baru' : ''),
        data: updated,
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal memperbarui blog', 'updateBlog');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus blog berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Blog berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  async removeBlog(@Param('id') id: string) {
    try {
      await this.blogService.remove(id);
      return {
        message: 'Blog berhasil dihapus',
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus blog dengan ID ${id}`, 'removeBlog');
    }
  }

  @Get('tags')
  @ApiOperation({ summary: 'Mendapatkan semua tag blog' })
  @ApiResponse({ status: 200, description: 'Daftar tag berhasil diambil' })
  async getAllTags() {
    try {
      const tags = await this.blogService.findAllTags();
      return {
        data: tags,
        message: 'Daftar tag berhasil diambil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar tag', 'getAllTags');
    }
  }

  @Get('tags/search')
  @ApiOperation({ summary: 'Mencari tag berdasarkan query' })
  @ApiResponse({ status: 200, description: 'Hasil pencarian tag' })
  async searchTags(@Query('q') query: string) {
    try {
      const tags = await this.blogService.searchTags(query);
      return {
        data: tags,
        message: 'Pencarian tag berhasil',
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mencari tag', 'searchTags');
    }
  }

  @Post('debug-upload')
  @ApiOperation({ summary: 'Debug upload file untuk melihat field yang dikirim' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Debug info' })
  @UseInterceptors(createFileUploadInterceptor())
  async debugUpload(@Req() req: any) {
    return logRequestDebugInfo(req, this.logger);
  }
}
