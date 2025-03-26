import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JenisMotorService } from '../services/jenis-motor.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from '../../../common/services';
import { memoryStorage } from 'multer';
import { Logger } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Jenis Motor')
@Controller('jenis-motor')
export class JenisMotorController {
  private readonly logger = new Logger(JenisMotorController.name);

  constructor(
    private readonly jenisMotorService: JenisMotorService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua jenis motor' })
  @ApiResponse({ status: 200, description: 'Daftar jenis motor berhasil diambil' })
  findAll() {
    return this.jenisMotorService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail jenis motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail jenis motor berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  findOne(@Param('id') id: string) {
    return this.jenisMotorService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Membuat jenis motor baru (dengan atau tanpa gambar)' })
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
        merk: {
          type: 'string',
        },
        model: {
          type: 'string',
        },
        cc: {
          type: 'integer',
          minimum: 50,
        },
      },
      required: ['merk', 'model', 'cc'],
    },
  })
  @ApiResponse({ status: 201, description: 'Jenis motor berhasil dibuat' })
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
  async create(
    @Body() createJenisMotorDto: CreateJenisMotorDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      // Jika ada file gambar, upload ke Cloudinary
      if (files && files.length > 0) {
        this.logger.log(`Memproses pembuatan jenis motor dengan gambar`);
        const file = files[0]; // Ambil file pertama
        this.logger.log(
          `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`,
        );

        // Upload gambar ke Cloudinary
        this.logger.log('Mengunggah gambar ke Cloudinary...');
        const gambarUrl = await this.cloudinaryService.uploadJenisMotorImage(file);

        if (!gambarUrl) {
          throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
        }

        this.logger.log(`Gambar berhasil diupload ke: ${gambarUrl}`);

        // Set gambar URL ke DTO
        createJenisMotorDto.gambar = gambarUrl;
      }

      // Buat jenis motor dengan atau tanpa gambar
      const created = await this.jenisMotorService.create(createJenisMotorDto);

      return {
        message:
          'Jenis motor berhasil dibuat' + (files && files.length > 0 ? ' dengan gambar' : ''),
        data: created,
      };
    } catch (error) {
      this.logger.error(`Error saat membuat jenis motor: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Gagal membuat jenis motor: ${error.message}`);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui jenis motor berdasarkan ID' })
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
        merk: {
          type: 'string',
        },
        model: {
          type: 'string',
        },
        cc: {
          type: 'integer',
          minimum: 50,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Jenis motor berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
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
  async update(
    @Param('id') id: string,
    @Body() updateJenisMotorDto: UpdateJenisMotorDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      // Dapatkan data jenis motor yang akan diupdate
      const jenisMotor = await this.jenisMotorService.findOne(id);

      if (!jenisMotor) {
        throw new NotFoundException(`Jenis motor dengan ID "${id}" tidak ditemukan`);
      }

      // Jika ada file gambar baru, upload ke Cloudinary
      if (files && files.length > 0) {
        this.logger.log(`Memproses update jenis motor dengan gambar baru`);
        const file = files[0]; // Ambil file pertama
        this.logger.log(
          `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`,
        );

        // Hapus gambar lama jika ada
        if (jenisMotor.gambar) {
          this.logger.log(`Menghapus gambar lama: ${jenisMotor.gambar}`);
          await this.cloudinaryService.deleteFile(jenisMotor.gambar);
        }

        // Upload gambar baru ke Cloudinary
        this.logger.log('Mengunggah gambar baru ke Cloudinary...');
        const gambarUrl = await this.cloudinaryService.uploadJenisMotorImage(file);

        if (!gambarUrl) {
          throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
        }

        this.logger.log(`Gambar baru berhasil diupload ke: ${gambarUrl}`);

        // Set gambar URL ke DTO
        updateJenisMotorDto.gambar = gambarUrl;
      }

      // Update jenis motor
      const updated = await this.jenisMotorService.update(id, updateJenisMotorDto);

      return {
        message:
          'Jenis motor berhasil diperbarui' +
          (files && files.length > 0 ? ' dengan gambar baru' : ''),
        data: updated,
      };
    } catch (error) {
      this.logger.error(`Error saat memperbarui jenis motor: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Gagal memperbarui jenis motor: ${error.message}`);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus jenis motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Jenis motor berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  async remove(@Param('id') id: string) {
    // Dapatkan data jenis motor yang akan dihapus
    const jenisMotor = await this.jenisMotorService.findOne(id);

    // Jika jenis motor memiliki gambar, hapus gambar dari Cloudinary
    try {
      if (jenisMotor && 'gambar' in jenisMotor && jenisMotor.gambar) {
        await this.cloudinaryService.deleteFile(jenisMotor.gambar);
      }
    } catch (error) {
      // Log error tapi lanjutkan proses
      console.error('Error saat menghapus gambar:', error);
    }

    // Hapus data jenis motor
    return this.jenisMotorService.remove(id);
  }
}
