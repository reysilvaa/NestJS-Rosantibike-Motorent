import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger } from '@nestjs/common';
import { TransaksiService } from '../services/transaksi.service';
import {
  CreateTransaksiDto,
  UpdateTransaksiDto,
  FilterTransaksiDto,
  CalculatePriceDto,
} from '../dto/index';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatusTransaksi } from '../../../common/enums/status.enum';
import {
  successResponse,
  handleError,
  paginationResponse,
  QrisHelper,
} from '../../../common/helpers';

@ApiTags('Transaksi')
@Controller('transaksi')
export class TransaksiController {
  private readonly logger = new Logger(TransaksiController.name);

  constructor(private readonly transaksiService: TransaksiService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat transaksi baru atau generate QRIS saja' })
  @ApiResponse({
    status: 201,
    description: 'Transaksi berhasil dibuat atau QRIS berhasil digenerate',
  })
  async create(@Body() createTransaksiDto: CreateTransaksiDto) {
    try {
      // Check if we only need to generate QRIS without saving
      if (createTransaksiDto.generateQRISOnly) {
        // Calculate the total price without saving to database
        const calculationResult = await this.transaksiService.calculatePrice({
          unitId: createTransaksiDto.unitId,
          tanggalMulai: createTransaksiDto.tanggalMulai,
          tanggalSelesai: createTransaksiDto.tanggalSelesai,
          jamMulai: createTransaksiDto.jamMulai,
          jamSelesai: createTransaksiDto.jamSelesai,
          helm: createTransaksiDto.helm || 0,
          jasHujan: createTransaksiDto.jasHujan || 0,
        });

        const taxtype = 'r';
        const fee = '1000';
        const finalNominal = Math.floor(Number(calculationResult.totalBiaya) || 0).toString();

        // Generate QRIS string
        const qrisString = QrisHelper.makeDynamicString(QrisHelper.DEFAULT_QRIS_CODE, finalNominal, {
          taxtype,
          fee,
        });

        // Generate QR code as base64
        const qrisBase64 = await QrisHelper.generateQRISBase64(QrisHelper.DEFAULT_QRIS_CODE, finalNominal, {
          taxtype,
          fee,
        });

        // Return QRIS data without saving transaction
        return successResponse(
          {
            calculationResult,
            qrisString,
            qrisBase64,
            qris: {
              qrisString,
              qrisBase64,
              nominal: finalNominal,
              fee,
            },
          },
          'QRIS berhasil dibuat',
          200
        );
      }

      // Normal flow - create transaction in database
      const result = await this.transaksiService.create(createTransaksiDto);

      const taxtype = 'r';
      const fee = '1000';
      const finalNominal = Math.floor(Number(result.totalBiaya) || 0).toString();

      // Generate QRIS string
      const qrisString = QrisHelper.makeDynamicString(QrisHelper.DEFAULT_QRIS_CODE, finalNominal, {
        taxtype,
        fee,
      });

      // Generate QR code as base64
      const qrisBase64 = await QrisHelper.generateQRISBase64(QrisHelper.DEFAULT_QRIS_CODE, finalNominal, {
        taxtype,
        fee,
      });

      // Add QRIS data to the response
      const responseData = {
        ...result,
        qrisString, // For backward compatibility
        qrisBase64: qrisBase64, // For backward compatibility
        qris: {
          qrisString,
          qrisBase64,
          nominal: finalNominal,
          fee,
        },
      };

      return successResponse(responseData, 'Transaksi berhasil dibuat', 201);
    } catch (error) {
      return handleError(this.logger, error, 'Gagal membuat transaksi');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi berhasil diambil',
  })
  async findAll(@Query() filter: FilterTransaksiDto) {
    try {
      const result = await this.transaksiService.findAll(filter);
      return paginationResponse(
        result.data,
        result.meta.total,
        result.meta.page,
        result.meta.limit,
        'Daftar transaksi berhasil diambil',
      );
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil daftar transaksi');
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Mendapatkan history transaksi' })
  @ApiResponse({
    status: 200,
    description: 'History transaksi berhasil diambil',
  })
  async getHistory(@Query() filter: FilterTransaksiDto) {
    try {
      filter.status = [StatusTransaksi.SELESAI, StatusTransaksi.OVERDUE];
      const result = await this.transaksiService.findAll(filter);
      return paginationResponse(
        result.data,
        result.meta.total,
        result.meta.page,
        result.meta.limit,
        'History transaksi berhasil diambil',
      );
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil history transaksi');
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Mencari transaksi berdasarkan nomor telepon' })
  @ApiResponse({ status: 200, description: 'Transaksi berhasil ditemukan' })
  async searchByPhone(@Query('noHP') noHP: string) {
    try {
      const result = await this.transaksiService.findByPhone(noHP);
      return successResponse(result, `Transaksi dengan nomor telepon ${noHP} berhasil ditemukan`);
    } catch (error) {
      return handleError(
        this.logger,
        error,
        `Gagal mencari transaksi dengan nomor telepon ${noHP}`,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail transaksi berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Detail transaksi berhasil diambil',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.transaksiService.findOne(id);

      // If transaction exists, generate QR code for payment
      if (result && result.totalBiaya) {
        const finalNominal = Math.floor(Number(result.totalBiaya) || 0).toString();
        const fee = '1000';

        // Generate QRIS string
        const qrisString = QrisHelper.makeDynamicString(QrisHelper.DEFAULT_QRIS_CODE, finalNominal, {
          taxtype: 'r',
          fee,
        });

        // Generate QR code as base64
        const qrisBase64 = await QrisHelper.generateQRISBase64(
          QrisHelper.DEFAULT_QRIS_CODE,
          finalNominal,
          { taxtype: 'r', fee }
        );

        // Add QRIS data to the response using type assertion
        const resultWithQris = result as any;
        resultWithQris.qrisString = qrisString; // For backward compatibility
        resultWithQris.qrisBase64 = qrisBase64; // For backward compatibility
        resultWithQris.qris = {
          qrisString,
          qrisBase64,
          nominal: finalNominal,
          fee,
        };
      }

      return successResponse(result, `Detail transaksi dengan ID ${id} berhasil diambil`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal mengambil detail transaksi dengan ID ${id}`);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil diperbarui',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  async update(@Param('id') id: string, @Body() updateTransaksiDto: UpdateTransaksiDto) {
    try {
      const result = await this.transaksiService.update(id, updateTransaksiDto);
      return successResponse(result, `Transaksi dengan ID ${id} berhasil diperbarui`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal memperbarui transaksi dengan ID ${id}`);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil dihapus',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  async remove(@Param('id') id: string) {
    try {
      const result = await this.transaksiService.remove(id);
      return successResponse(result, `Transaksi dengan ID ${id} berhasil dihapus`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal menghapus transaksi dengan ID ${id}`);
    }
  }

  @Post(':id/selesai')
  @ApiOperation({ summary: 'Menyelesaikan transaksi' })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil diselesaikan',
  })
  @ApiResponse({ status: 404, description: 'Transaksi tidak ditemukan' })
  async selesaiSewa(@Param('id') id: string) {
    try {
      const result = await this.transaksiService.selesaiSewa(id);
      return successResponse(result, `Transaksi dengan ID ${id} berhasil diselesaikan`);
    } catch (error) {
      return handleError(this.logger, error, `Gagal menyelesaikan transaksi dengan ID ${id}`);
    }
  }

  @Get('laporan/denda')
  @ApiOperation({ summary: 'Mendapatkan laporan denda' })
  @ApiResponse({
    status: 200,
    description: 'Laporan denda berhasil diambil',
  })
  async getLaporanDenda(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    try {
      const result = await this.transaksiService.getLaporanDenda(startDate, endDate);
      return successResponse(result, 'Laporan denda berhasil diambil');
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil laporan denda');
    }
  }

  @Get('laporan/fasilitas')
  @ApiOperation({ summary: 'Mendapatkan laporan penggunaan fasilitas' })
  @ApiResponse({
    status: 200,
    description: 'Laporan fasilitas berhasil diambil',
  })
  async getLaporanFasilitas(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const result = await this.transaksiService.getLaporanFasilitas(startDate, endDate);
      return successResponse(result, 'Laporan fasilitas berhasil diambil');
    } catch (error) {
      return handleError(this.logger, error, 'Gagal mengambil laporan fasilitas');
    }
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Menghitung harga sewa motor' })
  @ApiResponse({
    status: 200,
    description: 'Perhitungan harga berhasil',
  })
  async calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    try {
      const result = await this.transaksiService.calculatePrice(calculatePriceDto);
      return successResponse(result, 'Perhitungan harga berhasil');
    } catch (error) {
      return handleError(this.logger, error, 'Gagal menghitung harga sewa');
    }
  }
}
