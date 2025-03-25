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
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JenisMotorService } from '../services/jenis-motor.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from '../../../common/services';
import { memoryStorage } from 'multer';

@ApiTags('Jenis Motor')
@Controller('jenis-motor')
export class JenisMotorController {
  constructor(
    private readonly jenisMotorService: JenisMotorService,
    private readonly cloudinaryService: CloudinaryService
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
  @ApiOperation({ summary: 'Membuat jenis motor baru' })
  @ApiResponse({ status: 201, description: 'Jenis motor berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  create(@Body() createJenisMotorDto: CreateJenisMotorDto) {
    return this.jenisMotorService.create(createJenisMotorDto);
  }

  @Post(':id/upload-gambar')
  @ApiOperation({ summary: 'Upload gambar untuk jenis motor ke Cloudinary' })
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
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  @UseInterceptors(FileInterceptor('file', {
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
  }))
  async uploadGambar(
    @Param('id') id: string, 
    @UploadedFile() file: any
  ) {
    if (!file) {
      throw new BadRequestException('File gambar diperlukan');
    }
    
    // Dapatkan data jenis motor yang akan diupdate
    const jenisMotor = await this.jenisMotorService.findOne(id);
    
    // Jika jenis motor sudah memiliki gambar dalam record, hapus gambar lama dari Cloudinary
    try {
      // Jenis motor sudah ditemukan di database, tapi properti gambar mungkin tidak ada
      // Jadi kita perlu memeriksa apakah jenisMotor memiliki properti gambar
      if (jenisMotor && 'gambar' in jenisMotor && jenisMotor.gambar) {
        await this.cloudinaryService.deleteFile(jenisMotor.gambar);
      }
    } catch (error) {
      // Log error tapi lanjutkan proses
      console.error('Error saat menghapus gambar lama:', error);
    }
    
    // Upload gambar ke Cloudinary
    const gambarUrl = await this.cloudinaryService.uploadJenisMotorImage(file);
    
    // Update data jenis motor dengan URL gambar
    const updated = await this.jenisMotorService.update(id, { gambar: gambarUrl });
    
    return {
      message: 'Gambar berhasil diupload',
      data: updated
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui jenis motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Jenis motor berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Jenis motor tidak ditemukan' })
  update(@Param('id') id: string, @Body() updateJenisMotorDto: UpdateJenisMotorDto) {
    return this.jenisMotorService.update(id, updateJenisMotorDto);
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
