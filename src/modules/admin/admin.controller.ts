import { Controller, Post, Put, Delete, Body, Param, UseGuards, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAdminDto, UpdateAdminDto } from './dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('debug')
  @ApiOperation({ summary: 'Debug - Dapatkan daftar admin' })
  @ApiResponse({ status: 200, description: 'Daftar admin berhasil diambil' })
  async debug() {
    return this.adminService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buat admin baru' })
  @ApiResponse({ status: 201, description: 'Admin berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @ApiResponse({ status: 409, description: 'Username sudah digunakan' })
  async create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin' })
  @ApiResponse({ status: 200, description: 'Admin berhasil diupdate' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @ApiResponse({ status: 404, description: 'Admin tidak ditemukan' })
  async update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hapus admin' })
  @ApiResponse({ status: 200, description: 'Admin berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Admin tidak ditemukan' })
  async delete(@Param('id') id: string) {
    return this.adminService.delete(id);
  }
}
