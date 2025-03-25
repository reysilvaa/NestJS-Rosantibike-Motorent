import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database on module init', () => {
    jest.spyOn(service, '$connect').mockImplementation(jest.fn());
    service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('should disconnect from database on module destroy', async () => {
    jest.spyOn(service, '$disconnect').mockImplementation(jest.fn());
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});
