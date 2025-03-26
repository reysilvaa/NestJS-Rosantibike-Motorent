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
        message: 'Blog post berhasil ditemukan'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Gagal mengambil blog: ${error.message}`);
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
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file) {
          // Tidak ada file gambar, itu ok
          return cb(null, true);
        }
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Hanya file gambar yang diperbolehkan!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async createBlog(
    @Body() createBlogDto: CreateBlogPostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      // Jika slug tidak disediakan, isi dengan slug dari judul
      if (!createBlogDto.slug && createBlogDto.judul) {
        createBlogDto.slug = createBlogDto.judul
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      // Jika ada file gambar, upload ke Cloudinary
      if (files && files.length > 0) {
        this.logger.log(`Memproses pembuatan blog dengan gambar`);
        const file = files[0]; // Ambil file pertama
        this.logger.log(
          `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`,
        );

        // Upload gambar ke Cloudinary
        this.logger.log('Mengunggah gambar ke Cloudinary...');
        const gambarUrl = await this.cloudinaryService.uploadBlogImage(file);

        if (!gambarUrl) {
          throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
        }

        this.logger.log(`Gambar berhasil diupload ke: ${gambarUrl}`);

        // Set thumbnail URL ke DTO
        createBlogDto.featuredImage = gambarUrl;
      }

      // Buat blog dengan atau tanpa gambar
      const createdBlog = await this.blogService.create(createBlogDto);

      return {
        message: 'Blog berhasil dibuat' + (files && files.length > 0 ? ' dengan gambar' : ''),
        data: createdBlog,
      };
    } catch (error) {
      this.logger.error(`Error saat membuat blog: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Gagal membuat blog: ${error.message}`);
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
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file) {
          // Tidak ada file gambar, itu ok
          return cb(null, true);
        }
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Hanya file gambar yang diperbolehkan!'), false);
        }
        cb(null, true);
      },
    }),
  )
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
        this.logger.log(`Memproses update blog dengan gambar baru`);
        const file = files[0]; // Ambil file pertama
        this.logger.log(
          `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`,
        );

        // Hapus gambar lama jika ada
        if (blog.thumbnail) {
          this.logger.log(`Menghapus gambar lama: ${blog.thumbnail}`);
          await this.cloudinaryService.deleteFile(blog.thumbnail);
        }

        // Upload gambar baru ke Cloudinary
        this.logger.log('Mengunggah gambar baru ke Cloudinary...');
        const gambarUrl = await this.cloudinaryService.uploadBlogImage(file);

        if (!gambarUrl) {
          throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
        }

        this.logger.log(`Gambar baru berhasil diupload ke: ${gambarUrl}`);

        // Set thumbnail URL ke DTO
        updateBlogDto.featuredImage = gambarUrl;
      }

      // Update blog
      const updated = await this.blogService.update(id, updateBlogDto);

      return {
        message:
          'Blog berhasil diperbarui' + (files && files.length > 0 ? ' dengan gambar baru' : ''),
        data: updated,
      };
    } catch (error) {
      this.logger.error(`Error saat memperbarui blog: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Gagal memperbarui blog: ${error.message}`);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus blog berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Blog berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  async removeBlog(@Param('id') id: string) {
    // Dapatkan blog yang akan dihapus
    const blog = await this.blogService.findOne(id);

    // Jika blog memiliki gambar, hapus gambar dari Cloudinary
    if (blog.thumbnail) {
      await this.cloudinaryService.deleteFile(blog.thumbnail);
    }

    // Hapus blog
    return this.blogService.remove(id);
  }
}
