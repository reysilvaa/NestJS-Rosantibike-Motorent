import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { JenisMotorController } from './jenis-motor.controller';

describe('JenisMotorController', () => {
  let controller: JenisMotorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JenisMotorController],
    }).compile();

    controller = module.get<JenisMotorController>(JenisMotorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
