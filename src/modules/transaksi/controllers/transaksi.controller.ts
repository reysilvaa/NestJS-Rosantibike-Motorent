import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TransaksiService } from '../services/transaksi.service';
import { CreateTransaksiDto, UpdateTransaksiDto, FilterTransaksiDto } from '../dto/index';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatusTransaksi } from '../../../common/enums/status.enum';

@ApiTags('Transaksi')
@Controller('transaksi')
export class TransaksiController {
  constructor(private readonly transaksiService: TransaksiService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi berhasil diambil',
  })
  findAll(@Query() filter: FilterTransaksiDto) {
    return this.transaksiService.findAll(filter);
  }

  @Get('history')
  @ApiOperation({ summary: 'Mendapatkan history transaksi' })
  @ApiResponse({
    status: 200,
    description: 'History transaksi berhasil diambil',
  })
  getHistory(@Query() filter: FilterTransaksiDto) {
    // Menambahkan parameter untuk hanya mengambil transaksi yang sudah selesai atau overdue
    filter.status = [StatusTransaksi.SELESAI, StatusTransaksi.OVERDUE];
    return this.transaksiService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail transaksi berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Detail transaksi berhasil diambil',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  findOne(@Param('id') id: string) {
    return this.transaksiService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Membuat transaksi baru' })
  @ApiResponse({ status: 201, description: 'Transaksi berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  create(@Body() createTransaksiDto: CreateTransaksiDto) {
    return this.transaksiService.create(createTransaksiDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui transaksi berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  update(@Param('id') id: string, @Body() updateTransaksiDto: UpdateTransaksiDto) {
    return this.transaksiService.update(id, updateTransaksiDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus transaksi berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  remove(@Param('id') id: string) {
    return this.transaksiService.remove(id);
  }

  @Post(':id/selesai')
  @ApiOperation({ summary: 'Menyelesaikan transaksi sewa' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil diselesaikan' })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  selesai(@Param('id') id: string) {
    return this.transaksiService.selesaiSewa(id);
  }

  @Get('laporan/denda')
  @ApiOperation({ summary: 'Mendapatkan laporan denda' })
  @ApiResponse({ status: 200, description: 'Laporan denda berhasil diambil' })
  getLaporanDenda(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transaksiService.getLaporanDenda(startDate, endDate);
  }
  
  @Get('laporan/fasilitas')
  @ApiOperation({ summary: 'Mendapatkan laporan penggunaan fasilitas' })
  @ApiResponse({ status: 200, description: 'Laporan fasilitas berhasil diambil' })
  getLaporanFasilitas(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transaksiService.getLaporanFasilitas(startDate, endDate);
  }

  @Get('search')
  @ApiOperation({ summary: 'Mencari transaksi berdasarkan nomor telepon' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil ditemukan' })
  searchByPhone(@Query('noHP') noHP: string) {
    return this.transaksiService.findByPhone(noHP);
  }
}
