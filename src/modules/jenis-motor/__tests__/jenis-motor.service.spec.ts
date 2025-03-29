import { Test, TestingModule } from '@nestjs/testing';
import { JenisMotorService } from '../services/jenis-motor.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { CreateJenisMotorDto, UpdateJenisMotorDto } from '../dto';

// Mock helper functions
jest.mock('../helpers', () => ({
  verifyJenisMotorExists: jest.fn(),
  verifyCanDeleteJenisMotor: jest.fn(),
}));

// Import after mocking
import { verifyJenisMotorExists, verifyCanDeleteJenisMotor } from '../helpers';

describe('JenisMotorService', () => {
  let service: JenisMotorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    jenisMotor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    unitMotor: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JenisMotorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JenisMotorService>(JenisMotorService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new jenis motor', async () => {
      const dto: CreateJenisMotorDto = {
        merk: 'Honda',
        model: 'Vario',
        cc: 150,
      };

      const expected = {
        id: 'some-id',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.jenisMotor.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(mockPrismaService.jenisMotor.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return all jenis motor', async () => {
      const expected = [
        {
          id: '1',
          merk: 'Honda',
          model: 'Vario',
          cc: 150,
          unitMotor: [],
        },
      ];

      mockPrismaService.jenisMotor.findMany.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(mockPrismaService.jenisMotor.findMany).toHaveBeenCalledWith({
        include: { unitMotor: true },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return a jenis motor by id', async () => {
      const id = '1';
      const expected = {
        id,
        merk: 'Honda',
        model: 'Vario',
        cc: 150,
        unitMotor: [],
      };

      (verifyJenisMotorExists as jest.Mock).mockResolvedValue(expected);

      const result = await service.findOne(id);

      expect(verifyJenisMotorExists).toHaveBeenCalledWith(id, prisma, expect.any(Logger));
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should update a jenis motor', async () => {
      const id = '1';
      const dto: UpdateJenisMotorDto = {
        merk: 'Honda Updated',
      };

      const expected = {
        id,
        merk: 'Honda Updated',
        model: 'Vario',
        cc: 150,
      };

      (verifyJenisMotorExists as jest.Mock).mockResolvedValue({});
      mockPrismaService.jenisMotor.update.mockResolvedValue(expected);

      const result = await service.update(id, dto);

      expect(verifyJenisMotorExists).toHaveBeenCalledWith(id, prisma, expect.any(Logger));
      expect(mockPrismaService.jenisMotor.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should remove a jenis motor', async () => {
      const id = '1';
      const expected = {
        id,
        merk: 'Honda',
        model: 'Vario',
        cc: 150,
      };

      (verifyJenisMotorExists as jest.Mock).mockResolvedValue({});
      (verifyCanDeleteJenisMotor as jest.Mock).mockResolvedValue(true);
      mockPrismaService.jenisMotor.delete.mockResolvedValue(expected);

      const result = await service.remove(id);

      expect(verifyJenisMotorExists).toHaveBeenCalledWith(id, prisma, expect.any(Logger));
      expect(verifyCanDeleteJenisMotor).toHaveBeenCalledWith(id, prisma, expect.any(Logger));
      expect(mockPrismaService.jenisMotor.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(expected);
    });
  });
});
