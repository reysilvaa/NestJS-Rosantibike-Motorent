import { Controller, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: 'Buat admin baru' })
  @ApiResponse({ status: 201, description: 'Admin berhasil dibuat' })
  async create(@Body() data: { username: string; password: string; nama: string }) {
    return this.adminService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admin' })
  @ApiResponse({ status: 200, description: 'Admin berhasil diupdate' })
  async update(
    @Param('id') id: string,
    @Body() data: { username?: string; password?: string; nama?: string },
  ) {
    return this.adminService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus admin' })
  @ApiResponse({ status: 200, description: 'Admin berhasil dihapus' })
  async delete(@Param('id') id: string) {
    return this.adminService.delete(id);
  }
}
