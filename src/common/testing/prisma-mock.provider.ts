// import type { Provider } from '@nestjs/common';
// import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
// import { PrismaClient } from '@prisma/client';
// import { jest } from '@jest/globals';
// import {
//   PrismaService,
//   AdminType as _AdminType,
//   StatusMotor,
//   StatusTransaksi as _StatusTransaksi,
//   StatusArtikel as _StatusArtikel,
// } from '../prisma/prisma.service';

// /**
//  * Mock object untuk menggantikan PrismaService pada saat testing
//  *
//  * @description
//  * Berisi implementasi tiruan (mock) dari seluruh metode PrismaService
//  * yang diperlukan untuk pengujian unit dan integrasi tanpa melakukan
//  * koneksi ke database sebenarnya.
//  */
// export const mockPrismaService = {
//   $connect: jest.fn(),
//   $disconnect: jest.fn(),
//   $transaction: jest.fn().mockImplementation(callback => callback(mockPrismaService)),

//   admin: {
//     findUnique: jest.fn().mockResolvedValue({
//       id: 'mock-id',
//       username: 'admin',
//       password: 'hashed-password',
//       nama: 'Admin',
//     }),
//     findMany: jest.fn().mockResolvedValue([
//       {
//         id: 'mock-id',
//         username: 'admin',
//         password: 'hashed-password',
//         nama: 'Admin',
//       },
//     ]),
//     create: jest.fn().mockResolvedValue({
//       id: 'mock-id',
//       username: 'admin',
//       password: 'hashed-password',
//       nama: 'Admin',
//     }),
//     update: jest.fn().mockResolvedValue({
//       id: 'mock-id',
//       username: 'admin',
//       password: 'hashed-password',
//       nama: 'Admin',
//     }),
//     delete: jest.fn().mockResolvedValue({
//       id: 'mock-id',
//       username: 'admin',
//       password: 'hashed-password',
//       nama: 'Admin',
//     }),
//   },

//   unitMotor: {
//     findUnique: jest.fn().mockResolvedValue({
//       id: 'mock-id',
//       platNomor: 'AB1234XY',
//       status: StatusMotor.TERSEDIA,
//       hargaSewa: 100000,
//       jenisId: 'jenis-id',
//     }),
//     findMany: jest.fn().mockResolvedValue([]),
//     count: jest.fn().mockResolvedValue(0),
//     create: jest.fn().mockResolvedValue({}),
//     update: jest.fn().mockResolvedValue({}),
//     delete: jest.fn().mockResolvedValue({}),
//   },

//   // Tambahkan mock lain sesuai kebutuhan
// };

// /**
//  * Provider untuk PrismaService mock
//  */
// export const PrismaMockProvider: Provider = {
//   provide: PrismaService,
//   useFactory: () => {
//     return mockDeep<PrismaService>();
//   },
// };

// export type MockPrismaClient = DeepMockProxy<PrismaClient>;
// export type MockPrismaService = DeepMockProxy<PrismaService>;
