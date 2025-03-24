import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { JenisMotorService } from '../services/jenis-motor.service';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';

@Controller('jenis-motor')
export class JenisMotorController {
  constructor(private readonly jenisMotorService: JenisMotorService) {}

  @Get()
  findAll() {
    return this.jenisMotorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jenisMotorService.findOne(id);
  }

  @Post()
  create(@Body() createJenisMotorDto: CreateJenisMotorDto) {
    return this.jenisMotorService.create(createJenisMotorDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJenisMotorDto: UpdateJenisMotorDto) {
    return this.jenisMotorService.update(id, updateJenisMotorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jenisMotorService.remove(id);
  }
}
