import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger } from '@nestjs/common';
import { UnitMotorService } from '../services/unit-motor.service';
import {
  CreateUnitMotorDto,
  UpdateUnitMotorDto,
  FilterUnitMotorDto,
  CheckAvailabilityDto,
} from '../dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { successResponse, handleError } from '../../../common/helpers';

@ApiTags('Unit Motor')
@Controller('unit-motor')
export class UnitMotorController {
  private readonly logger = new Logger(UnitMotorController.name);
  
  constructor(private readonly unitMotorService: UnitMotorService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua unit motor' })
  @ApiResponse({ status: 200, description: 'Daftar unit motor berhasil diambil' })
  async findAll(@Query() filter: FilterUnitMotorDto) {
    try {
      const result = await this.unitMotorService.findAll(filter);
      return successResponse(result, 'Daftar unit motor berhasil diambil');
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar unit motor');
    }
  }

  @Get('availability')
  @ApiOperation({ summary: 'Memeriksa ketersediaan motor untuk rentang tanggal tertentu' })
  @ApiResponse({ status: 200, description: 'Data ketersediaan berhasil diambil' })
  @ApiResponse({ status: 400, description: 'Format tanggal tidak valid' })
  async checkAvailability(@Query() checkAvailabilityDto: CheckAvailabilityDto) {
    try {
      const result = await this.unitMotorService.checkAvailability(checkAvailabilityDto);
      return successResponse(result, 'Data ketersediaan berhasil diambil');
    } catch (error) {
      return handleError(this.logger, error, 'Gagal memeriksa ketersediaan motor');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail unit motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail unit motor berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Unit motor tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.unitMotorService.findOne(id);
      return successResponse(result, `Detail unit motor dengan ID ${id} berhasil diambil`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil detail unit motor dengan ID ${id}`);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Membuat unit motor baru' })
  @ApiResponse({ status: 201, description: 'Unit motor berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  async create(@Body() createUnitMotorDto: CreateUnitMotorDto) {
    try {
      const result = await this.unitMotorService.create(createUnitMotorDto);
      return successResponse(result, 'Unit motor berhasil dibuat', 201);
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat unit motor baru');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui unit motor' })
  @ApiResponse({ status: 200, description: 'Unit motor berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Unit motor tidak ditemukan' })
  async update(@Param('id') id: string, @Body() updateUnitMotorDto: UpdateUnitMotorDto) {
    try {
      const result = await this.unitMotorService.update(id, updateUnitMotorDto);
      return successResponse(result, `Unit motor dengan ID ${id} berhasil diperbarui`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui unit motor dengan ID ${id}`);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus unit motor' })
  @ApiResponse({ status: 200, description: 'Unit motor berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Unit motor tidak ditemukan' })
  async remove(@Param('id') id: string) {
    try {
      const result = await this.unitMotorService.remove(id);
      return successResponse(result, `Unit motor dengan ID ${id} berhasil dihapus`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus unit motor dengan ID ${id}`);
    }
  }
}
