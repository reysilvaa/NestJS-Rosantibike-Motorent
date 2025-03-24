import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UnitMotorService } from '../services/unit-motor.service';
import { CreateUnitMotorDto, UpdateUnitMotorDto, FilterUnitMotorDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Unit Motor')
@Controller('unit-motor')
export class UnitMotorController {
  constructor(private readonly unitMotorService: UnitMotorService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua unit motor' })
  @ApiResponse({ status: 200, description: 'Daftar unit motor berhasil diambil' })
  findAll(@Query() filter: FilterUnitMotorDto) {
    return this.unitMotorService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail unit motor berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail unit motor berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Unit motor tidak ditemukan' })
  findOne(@Param('id') id: string) {
    return this.unitMotorService.findOne(id);
  }

  @Post()
  create(@Body() createUnitMotorDto: CreateUnitMotorDto) {
    return this.unitMotorService.create(createUnitMotorDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitMotorDto: UpdateUnitMotorDto) {
    return this.unitMotorService.update(id, updateUnitMotorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitMotorService.remove(id);
  }
}
