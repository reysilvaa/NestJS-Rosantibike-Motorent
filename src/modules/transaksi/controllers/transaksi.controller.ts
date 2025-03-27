import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TransaksiService } from '../services/transaksi.service';
import { CreateTransaksiDto, UpdateTransaksiDto, FilterTransaksiDto, CalculatePriceDto } from '../dto/index';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatusTransaksi } from '../../../common/enums/status.enum';

@ApiTags('Transaksi')
@Controller('transaksi')
export class TransaksiController {
  constructor(private readonly transaksiService: TransaksiService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat transaksi baru' })
  @ApiResponse({
    status: 201,
    description: 'Transaksi berhasil dibuat',
  })
  create(@Body() createTransaksiDto: CreateTransaksiDto) {
    return this.transaksiService.create(createTransaksiDto);
  }

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

  @Get('search')
  @ApiOperation({ summary: 'Mencari transaksi berdasarkan nomor telepon' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil ditemukan' })
  searchByPhone(@Query('noHP') noHP: string) {
    return this.transaksiService.findByPhone(noHP);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil diperbarui',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  update(@Param('id') id: string, @Body() updateTransaksiDto: UpdateTransaksiDto) {
    return this.transaksiService.update(id, updateTransaksiDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil dihapus',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  remove(@Param('id') id: string) {
    return this.transaksiService.remove(id);
  }

  @Post(':id/selesai')
  @ApiOperation({ summary: 'Menyelesaikan transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil diselesaikan',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  selesaiSewa(@Param('id') id: string) {
    return this.transaksiService.selesaiSewa(id);
  }

  @Get('laporan/denda')
  @ApiOperation({ summary: 'Mendapatkan laporan denda' })
  @ApiResponse({
    status: 200,
    description: 'Laporan denda berhasil diambil',
  })
  getLaporanDenda(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transaksiService.getLaporanDenda(startDate, endDate);
  }

  @Get('laporan/fasilitas')
  @ApiOperation({ summary: 'Mendapatkan laporan penggunaan fasilitas' })
  @ApiResponse({
    status: 200,
    description: 'Laporan fasilitas berhasil diambil',
  })
  getLaporanFasilitas(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transaksiService.getLaporanFasilitas(startDate, endDate);
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Menghitung harga sewa motor' })
  @ApiResponse({
    status: 200,
    description: 'Perhitungan harga berhasil',
  })
  calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    return this.transaksiService.calculatePrice(calculatePriceDto);
  }
}
