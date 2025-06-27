import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Req,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { JenisMotorService } from '../services/jenis-motor.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto, FilterJenisMotorDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from '../../../common/services';
import { Logger } from '@nestjs/common';
import {
  createFileUploadInterceptor,
  getFirstFile,
  getFileInfo,
  handleError,
  logInfo,
  successResponse,
} from '../../../common/helpers';

@ApiTags('Jenis Motor')
@Controller('jenis-motor')
export class JenisMotorController {
  private readonly logger = new Logger(JenisMotorController.name);

  constructor(
    private readonly jenisMotorService: JenisMotorService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua jenis motor dengan paginasi dan filter' })
  @ApiResponse({ status: 200, description: 'Daftar jenis motor berhasil diambil' })
  findAll(@Query() filter: FilterJenisMotorDto) {
    return this.jenisMotorService.findAll(filter);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Mendapatkan detail jenis motor berdasarkan slug' })
  @ApiResponse({ status: 200, description: 'Detail jenis motor berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  async findBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.jenisMotorService.findBySlug(slug);
      return successResponse(result, `Detail jenis motor dengan slug ${slug} berhasil diambil`);
    } catch (error) {
      return handleError(
        this.logger,
        error,
        `Gagal mengambil detail jenis motor dengan slug ${slug}`,
      );
    }
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
  @UseInterceptors(createFileUploadInterceptor())
  async create(
    @Body() createJenisMotorDto: CreateJenisMotorDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      createJenisMotorDto.cc = Number(createJenisMotorDto.cc);

      if (files && files.length > 0) {
        logInfo(this.logger, `Memproses pembuatan jenis motor dengan gambar`);
        const file = getFirstFile(files, false);
        if (file) {
          logInfo(this.logger, getFileInfo(file));

          logInfo(this.logger, 'Mengunggah gambar ke Cloudinary...');
          const gambarUrl = await this.cloudinaryService.uploadJenisMotorImage(file);

          if (!gambarUrl) {
            throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
          }

          logInfo(this.logger, `Gambar berhasil diupload ke: ${gambarUrl}`);

          createJenisMotorDto.gambar = gambarUrl;
        }
      }

      const created = await this.jenisMotorService.create(createJenisMotorDto);

      return {
        message:
          'Jenis motor berhasil dibuat' + (files && files.length > 0 ? ' dengan gambar' : ''),
        data: created,
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat jenis motor', 'create');
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
  @UseInterceptors(createFileUploadInterceptor())
  async update(
    @Param('id') id: string,
    @Body() updateJenisMotorDto: UpdateJenisMotorDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      if (updateJenisMotorDto.cc !== undefined) {
        updateJenisMotorDto.cc = Number(updateJenisMotorDto.cc);
      }

      const jenisMotor = await this.jenisMotorService.findOne(id);

      if (!jenisMotor) {
        throw new NotFoundException(`Jenis motor dengan ID "${id}" tidak ditemukan`);
      }

      if (files && files.length > 0) {
        logInfo(this.logger, `Memproses update jenis motor dengan gambar baru`);
        const file = getFirstFile(files, false);
        if (file) {
          logInfo(this.logger, getFileInfo(file));

          if (jenisMotor.gambar) {
            logInfo(this.logger, `Menghapus gambar lama: ${jenisMotor.gambar}`);
            await this.cloudinaryService.deleteFile(jenisMotor.gambar);
          }

          logInfo(this.logger, 'Mengunggah gambar baru ke Cloudinary...');
          const gambarUrl = await this.cloudinaryService.uploadJenisMotorImage(file);

          if (!gambarUrl) {
            throw new BadRequestException('Gagal mengupload gambar ke Cloudinary');
          }

          logInfo(this.logger, `Gambar baru berhasil diupload ke: ${gambarUrl}`);

          updateJenisMotorDto.gambar = gambarUrl;
        }
      }

      const updated = await this.jenisMotorService.update(id, updateJenisMotorDto);

      return {
        message:
          'Jenis motor berhasil diperbarui' +
          (files && files.length > 0 ? ' dengan gambar baru' : ''),
        data: updated,
      };
    } catch (error) {
      return handleError(this.logger, error, 'Gagal memperbarui jenis motor', 'update');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus jenis motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Jenis motor berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  async remove(@Param('id') id: string) {
    const jenisMotor = await this.jenisMotorService.findOne(id);

    try {
      if (jenisMotor && 'gambar' in jenisMotor && jenisMotor.gambar) {
        await this.cloudinaryService.deleteFile(jenisMotor.gambar);
      }

      const result = await this.jenisMotorService.remove(id);
      return {
        message: `Jenis motor dengan ID ${id} berhasil dihapus`,
        data: result,
      };
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus jenis motor dengan ID ${id}`);
    }
  }

  @Get('debug/upload')
  @ApiOperation({ summary: 'Debug upload file (hanya untuk pengujian)' })
  async debugUpload(@Req() req: any) {
    return {
      message: 'Debug upload',
      headers: req.headers,
      body: req.body,
    };
  }
}
