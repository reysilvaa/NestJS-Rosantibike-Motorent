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
} from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto, FilterBlogPostDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../../common/services';
import { memoryStorage } from 'multer';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
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

  @Post()
  @ApiOperation({ summary: 'Membuat blog baru' })
  @ApiResponse({ status: 201, description: 'Blog berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  createBlog(@Body() createBlogDto: CreateBlogPostDto) {
    return this.blogService.create(createBlogDto);
  }

  @Post(':id/upload-gambar')
  @ApiOperation({ summary: 'Upload gambar untuk blog ke Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Gambar berhasil diupload' })
  @ApiResponse({ status: 400, description: 'File tidak valid' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Gunakan memoryStorage untuk menyimpan file di memory sementara
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        // Filter tipe file (hanya gambar)
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Hanya file gambar yang diperbolehkan!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadGambar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File gambar diperlukan');
    }

    // Dapatkan blog yang akan diupdate
    const blog = await this.blogService.findOne(id);

    // Jika blog sudah memiliki gambar, hapus gambar lama
    if (blog.thumbnail) {
      await this.cloudinaryService.deleteFile(blog.thumbnail);
    }

    // Upload gambar ke Cloudinary
    const gambarUrl = await this.cloudinaryService.uploadBlogImage(file);

    // Update blog dengan URL gambar baru
    const updated = await this.blogService.update(id, { thumbnail: gambarUrl });

    return {
      message: 'Gambar berhasil diupload',
      data: updated,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui blog berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Blog berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Blog tidak ditemukan' })
  updateBlog(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogPostDto) {
    return this.blogService.update(id, updateBlogDto);
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
