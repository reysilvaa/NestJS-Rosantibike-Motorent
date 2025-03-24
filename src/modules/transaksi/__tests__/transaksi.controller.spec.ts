import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TransaksiController } from './transaksi.controller';
import { TransaksiService } from './transaksi.service';
import { StatusTransaksi } from '@prisma/client';
import type { FilterTransaksiDto, CreateTransaksiDto, UpdateTransaksiDto } from './dto/index';

describe('TransaksiController', () => {
  let controller: TransaksiController;
  // Dibutuhkan untuk implementasi, tetapi perlu diberi awalan _ untuk menandai bahwa ini sengaja tidak digunakan
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _mockTransaksiService: TransaksiService;

  const mockServiceImplementation = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    selesaiSewa: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransaksiController],
      providers: [
        {
          provide: TransaksiService,
          useValue: mockServiceImplementation,
        },
      ],
    }).compile();

    controller = module.get<TransaksiController>(TransaksiController);
    _mockTransaksiService = module.get<TransaksiService>(TransaksiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      // Arrange
      const filter: FilterTransaksiDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [
          {
            id: 'id1',
            namaPenyewa: 'Test User',
            status: StatusTransaksi.AKTIF,
            unitMotor: { jenis: { merk: 'Honda', model: 'Beat' } },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockServiceImplementation.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filter);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.findAll).toHaveBeenCalledWith(filter);
    });
  });

  describe('getHistory', () => {
    it('should return history transactions (SELESAI and OVERDUE)', async () => {
      // Arrange
      const filter: FilterTransaksiDto = { page: 1, limit: 10 };
      const expectedFilterWithStatus = {
        ...filter,
        status: [StatusTransaksi.SELESAI, StatusTransaksi.OVERDUE],
      };
      const expectedResult = {
        data: [
          {
            id: 'id1',
            namaPenyewa: 'Test User',
            status: StatusTransaksi.SELESAI,
            unitMotor: { jenis: { merk: 'Honda', model: 'Beat' } },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockServiceImplementation.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getHistory(filter);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.findAll).toHaveBeenCalledWith(expectedFilterWithStatus);
      expect(filter.status).toEqual([StatusTransaksi.SELESAI, StatusTransaksi.OVERDUE]);
    });
  });

  describe('findOne', () => {
    it('should return a single transaction by id', async () => {
      // Arrange
      const id = 'testId';
      const expectedResult = {
        id,
        namaPenyewa: 'Test User',
        status: StatusTransaksi.AKTIF,
      };
      mockServiceImplementation.findOne.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findOne(id);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      // Arrange
      const createDto: CreateTransaksiDto = {
        namaPenyewa: 'Test User',
        noWhatsapp: '08123456789',
        unitId: 'unit1',
        tanggalMulai: '2023-01-01',
        tanggalSelesai: '2023-01-05',
      };
      const expectedResult = {
        id: 'newId',
        ...createDto,
        status: StatusTransaksi.AKTIF,
      };
      mockServiceImplementation.create.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an existing transaction', async () => {
      // Arrange
      const id = 'testId';
      const updateDto: UpdateTransaksiDto = {
        namaPenyewa: 'Updated User',
      };
      const expectedResult = {
        id,
        namaPenyewa: 'Updated User',
        status: StatusTransaksi.AKTIF,
      };
      mockServiceImplementation.update.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.update(id, updateDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.update).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      // Arrange
      const id = 'testId';
      const expectedResult = { message: 'Transaksi berhasil dihapus' };
      mockServiceImplementation.remove.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.remove(id);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('selesai', () => {
    it('should complete a transaction', async () => {
      // Arrange
      const id = 'testId';
      const expectedResult = {
        id,
        namaPenyewa: 'Test User',
        status: StatusTransaksi.SELESAI,
      };
      mockServiceImplementation.selesaiSewa.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.selesai(id);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockServiceImplementation.selesaiSewa).toHaveBeenCalledWith(id);
    });
  });
});
