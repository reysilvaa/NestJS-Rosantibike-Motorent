import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { JenisMotorService } from '../services/jenis-motor.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Jenis Motor')
@Controller('jenis-motor')
export class JenisMotorController {
  constructor(private readonly jenisMotorService: JenisMotorService) {}

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
  remove(@Param('id') id: string) {
    return this.jenisMotorService.remove(id);
  }
}
