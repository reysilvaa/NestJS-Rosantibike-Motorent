import { Test, TestingModule } from '@nestjs/testing';
import { TransaksiProcessor } from '../processors/transaksi.processor';
import {
  PrismaService,
  StatusMotor,
  StatusTransaksi,
  TransaksiWithRelations,
} from '../../../common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Job } from 'bullmq';

// Definisikan tipe untuk mock PrismaService
type MockPrismaService = {
  transaksiSewa: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  unitMotor: {
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('TransaksiProcessor', () => {
  let processor: TransaksiProcessor;
  let mockPrisma: MockPrismaService;

  const mockTransaksiData = {
    id: 'trans1',
    namaPenyewa: 'Test User',
    noWhatsapp: '08123456789',
    unitId: 'unit1',
    tanggalMulai: new Date('2023-01-01'),
    tanggalSelesai: new Date('2023-01-05'),
    totalBiaya: new Decimal(500000),
    status: StatusTransaksi.AKTIF,
    unitMotor: {
      id: 'unit1',
      status: 'DISEWA',
      jenis: {
        merk: 'Honda',
        model: 'Beat',
      },
      platNomor: 'B1234ABC',
    },
  };

  beforeEach(async () => {
    mockPrisma = {
      transaksiSewa: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      unitMotor: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        return callback(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransaksiProcessor,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    processor = module.get<TransaksiProcessor>(TransaksiProcessor);

    // Mock WhatsApp related methods
    jest.spyOn(processor as any, 'initWhatsApp').mockImplementation(() => Promise.resolve());
    jest.spyOn(processor as any, '_connect').mockImplementation(() => Promise.resolve());
    jest.spyOn(processor as any, 'ensureConnected').mockImplementation(() => Promise.resolve());
    jest.spyOn(processor as any, 'sendWhatsAppMessage').mockResolvedValue(true);

    // Mock message generation methods
    jest.spyOn(processor as any, 'generateBookingMessage').mockReturnValue('Booking message');
    jest.spyOn(processor as any, 'generateReminderMessage').mockReturnValue('Reminder message');
    jest.spyOn(processor as any, 'generateOverdueMessage').mockReturnValue('Overdue message');
    jest
      .spyOn(processor as any, 'generateAdminOverdueMessage')
      .mockReturnValue('Admin overdue message');
    jest.spyOn(processor as any, 'generateCompletionMessage').mockReturnValue('Completion message');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleNotifikasiBooking', () => {
    it('should process notification job and send WhatsApp message', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(mockTransaksiData);

      // Act
      await processor.handleNotifikasiBooking(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
      expect((processor as any).generateBookingMessage).toHaveBeenCalledWith(mockTransaksiData);
      expect((processor as any).sendWhatsAppMessage).toHaveBeenCalledWith(
        mockTransaksiData.noWhatsapp,
        'Booking message',
      );
    });

    it('should handle case when transaction not found', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'nonexistent' },
      } as Job<{ transaksiId: string }>;

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(null);

      // Act
      await processor.handleNotifikasiBooking(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
      expect((processor as any).generateBookingMessage).not.toHaveBeenCalled();
      expect((processor as any).sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });

  describe('handlePengingatPengembalian', () => {
    it('should process reminder notification job and send WhatsApp message', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(mockTransaksiData);

      // Act
      await processor.handlePengingatPengembalian(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
      expect((processor as any).generateReminderMessage).toHaveBeenCalledWith(mockTransaksiData);
      expect((processor as any).sendWhatsAppMessage).toHaveBeenCalledWith(
        mockTransaksiData.noWhatsapp,
        'Reminder message',
      );
    });

    it('should not send reminder if transaction is not active', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      const inactiveTransaction = {
        ...mockTransaksiData,
        status: StatusTransaksi.SELESAI,
      };

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(inactiveTransaction);

      // Act
      await processor.handlePengingatPengembalian(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
      expect((processor as any).generateReminderMessage).not.toHaveBeenCalled();
      expect((processor as any).sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleNotifikasiSelesai', () => {
    it('should process completion notification job and send WhatsApp message', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(mockTransaksiData);

      // Act
      await processor.handleNotifikasiSelesai(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });
      expect((processor as any).generateCompletionMessage).toHaveBeenCalledWith(mockTransaksiData);
      expect((processor as any).sendWhatsAppMessage).toHaveBeenCalledWith(
        mockTransaksiData.noWhatsapp,
        'Completion message',
      );
    });
  });

  describe('handleCekOverdue', () => {
    it('should update transaction to overdue status when past due date', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      // Set tanggalSelesai to past date
      const overdueTransaction = {
        ...mockTransaksiData,
        tanggalSelesai: new Date(Date.now() - 3600000), // 1 hour ago
      };

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(overdueTransaction);

      // Mock process.env.ADMIN_WHATSAPP
      const originalEnv = process.env;
      process.env = { ...originalEnv, ADMIN_WHATSAPP: '+6285232152313' };

      // Act
      await processor.handleCekOverdue(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      // Verify $transaction was called to update both records
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Check that the transaction was updated to OVERDUE
      expect(mockPrisma.transaksiSewa.update).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        data: { status: StatusTransaksi.OVERDUE },
      });

      // Check that the unit motor was updated to OVERDUE
      expect(mockPrisma.unitMotor.update).toHaveBeenCalledWith({
        where: { id: 'unit1' },
        data: { status: StatusMotor.OVERDUE },
      });

      // Verify WhatsApp messages were sent to customer
      expect((processor as any).generateOverdueMessage).toHaveBeenCalledWith(overdueTransaction);
      expect((processor as any).sendWhatsAppMessage).toHaveBeenCalledWith(
        overdueTransaction.noWhatsapp,
        'Overdue message',
      );

      // Verify WhatsApp messages were sent to admin
      expect((processor as any).generateAdminOverdueMessage).toHaveBeenCalledWith(
        overdueTransaction,
      );
      expect((processor as any).sendWhatsAppMessage).toHaveBeenCalledWith(
        '+6285232152313',
        'Admin overdue message',
      );

      // Restore env
      process.env = originalEnv;
    });

    it('should not update to overdue if transaction is not active', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      const completedTransaction = {
        ...mockTransaksiData,
        status: StatusTransaksi.SELESAI,
        tanggalSelesai: new Date(Date.now() - 3600000), // 1 hour ago
      };

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(completedTransaction);

      // Act
      await processor.handleCekOverdue(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      // Verify $transaction was NOT called
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.transaksiSewa.update).not.toHaveBeenCalled();
      expect(mockPrisma.unitMotor.update).not.toHaveBeenCalled();

      // Verify no WhatsApp messages were sent
      expect((processor as any).sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should not update to overdue if not past due date', async () => {
      // Arrange
      const job = {
        data: { transaksiId: 'trans1' },
      } as Job<{ transaksiId: string }>;

      // Set tanggalSelesai to future date
      const futureTransaction = {
        ...mockTransaksiData,
        tanggalSelesai: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockPrisma.transaksiSewa.findUnique.mockResolvedValue(futureTransaction);

      // Act
      await processor.handleCekOverdue(job);

      // Assert
      expect(mockPrisma.transaksiSewa.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans1' },
        include: {
          unitMotor: {
            include: {
              jenis: true,
            },
          },
        },
      });

      // Verify $transaction was NOT called
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.transaksiSewa.update).not.toHaveBeenCalled();
      expect(mockPrisma.unitMotor.update).not.toHaveBeenCalled();

      // Verify no WhatsApp messages were sent
      expect((processor as any).sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });

  describe('WhatsApp message generation', () => {
    it('should be able to generate proper booking message', async () => {
      // Access the real implementation without mocking
      jest.spyOn(processor as any, 'generateBookingMessage').mockRestore();

      // Execute
      const message = (processor as any).generateBookingMessage(mockTransaksiData);

      // Assert
      expect(message).toContain(mockTransaksiData.namaPenyewa);
      expect(message).toContain(mockTransaksiData.unitMotor.jenis.merk);
      expect(message).toContain(mockTransaksiData.unitMotor.jenis.model);
      expect(message).toContain(mockTransaksiData.unitMotor.platNomor);
    });

    it('should be able to generate proper reminder message', async () => {
      // Access the real implementation without mocking
      jest.spyOn(processor as any, 'generateReminderMessage').mockRestore();

      // Execute
      const message = (processor as any).generateReminderMessage(mockTransaksiData);

      // Assert
      expect(message).toContain(mockTransaksiData.namaPenyewa);
      expect(message).toContain(mockTransaksiData.unitMotor.jenis.merk);
      expect(message).toContain(mockTransaksiData.unitMotor.jenis.model);
    });

    it('should be able to generate proper overdue message', async () => {
      // Access the real implementation without mocking
      jest.spyOn(processor as any, 'generateOverdueMessage').mockRestore();

      // Execute
      const message = (processor as any).generateOverdueMessage(mockTransaksiData);

      // Assert
      expect(message).toContain(mockTransaksiData.namaPenyewa);
      expect(message).toContain('TERLAMBAT');
      expect(message).toContain('OVERDUE');
    });

    it('should be able to generate proper admin overdue message', async () => {
      // Access the real implementation without mocking
      jest.spyOn(processor as any, 'generateAdminOverdueMessage').mockRestore();

      // Execute
      const message = (processor as any).generateAdminOverdueMessage(mockTransaksiData);

      // Assert
      expect(message).toContain(mockTransaksiData.namaPenyewa);
      expect(message).toContain(mockTransaksiData.noWhatsapp);
      expect(message).toContain('OVERDUE');
    });

    it('should be able to generate proper completion message', async () => {
      // Access the real implementation without mocking
      jest.spyOn(processor as any, 'generateCompletionMessage').mockRestore();

      // Execute
      const message = (processor as any).generateCompletionMessage(mockTransaksiData);

      // Assert
      expect(message).toContain(mockTransaksiData.namaPenyewa);
      expect(message).toContain('SELESAI');
    });
  });

  describe('WhatsApp connection', () => {
    it('should have initWhatsApp method', () => {
      // Verfikasi bahwa metode initWhatsApp ada
      expect(typeof (processor as any).initWhatsApp).toBe('function');
    });

    it('should format phone number correctly in sendWhatsAppMessage', async () => {
      // Mock the whatsappClient
      (processor as any).whatsappClient = {
        sendMessage: jest.fn().mockResolvedValue(true),
      };
      (processor as any).isConnected = true;

      // Restore mock implementation
      jest.spyOn(processor as any, 'sendWhatsAppMessage').mockRestore();
      jest.spyOn(processor as any, 'ensureConnected').mockResolvedValue(undefined);

      // Test with different phone formats
      await (processor as any).sendWhatsAppMessage('08123456789', 'Test message');
      expect((processor as any).whatsappClient.sendMessage).toHaveBeenCalledWith(
        '08123456789@s.whatsapp.net',
        { text: 'Test message' },
      );

      // Test with + format
      await (processor as any).sendWhatsAppMessage('+628123456789', 'Test message');
      expect((processor as any).whatsappClient.sendMessage).toHaveBeenCalledWith(
        '628123456789@s.whatsapp.net',
        { text: 'Test message' },
      );
    });
  });
});
