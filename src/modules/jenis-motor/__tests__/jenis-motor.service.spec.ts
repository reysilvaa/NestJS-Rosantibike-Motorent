import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { JenisMotorService } from './jenis-motor.service';

describe('JenisMotorService', () => {
  let service: JenisMotorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JenisMotorService],
    }).compile();

    service = module.get<JenisMotorService>(JenisMotorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
