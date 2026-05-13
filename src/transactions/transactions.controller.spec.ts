import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionStatus } from './dto';

const mockAgent = {
  id: 'agent-uuid-1',
  name: 'Agent One',
  phone: '01899887766',
  role: 'agent',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTx = {
  id: 'tx-uuid-1',
  transactionId: 'A2B3C4D5E6',
  amount: '1500.00',
  transactionTime: new Date(),
  status: 'received',
  agentId: 'agent-uuid-1',
  senderPhone: '01711223344',
  receiverPhone: '01899887766',
  rawMessage: 'Cash Out Tk 1,500.00...',
  createdAt: new Date(),
};

const mockPaginated = {
  data: [mockTx],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
};

const mockSummary = {
  totalPaidAmount: 1500,
  totalTransactionCount: 1,
  period: 'monthly',
  from: '2026-05-01',
  to: '2026-05-31',
};

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: jest.Mocked<TransactionsService>;

  beforeEach(async () => {
    transactionsService = {
      upload: jest.fn().mockResolvedValue(mockTx),
      verify: jest.fn().mockResolvedValue(mockTx),
      updateStatus: jest.fn().mockResolvedValue({ ...mockTx, status: 'paid' }),
      findByAgent: jest.fn().mockResolvedValue(mockPaginated),
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: transactionsService }],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  describe('upload', () => {
    it('delegates to transactionsService.upload with user context', async () => {
      const dto = { rawMessage: 'Cash Out Tk 1,500.00...' };
      const result = await controller.upload(mockAgent as any, dto);

      expect(transactionsService.upload).toHaveBeenCalledWith(
        'agent-uuid-1',
        '01899887766',
        dto,
      );
      expect(result).toBe(mockTx);
    });
  });

  describe('verify', () => {
    it('delegates to transactionsService.verify', async () => {
      const result = await controller.verify('A2B3C4D5E6');

      expect(transactionsService.verify).toHaveBeenCalledWith('A2B3C4D5E6');
      expect(result).toBe(mockTx);
    });
  });

  describe('updateStatus', () => {
    it('delegates to transactionsService.updateStatus with user context', async () => {
      const dto = { status: TransactionStatus.PAID };
      const result = await controller.updateStatus('A2B3C4D5E6', dto);

      expect(transactionsService.updateStatus).toHaveBeenCalledWith(
        'A2B3C4D5E6',
        'agent-uuid-1',
        dto,
      );
      expect(result.status).toBe('paid');
    });
  });

  describe('findAll', () => {
    it('delegates to transactionsService.findByAgent', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(mockAgent as any, query as any);

      expect(transactionsService.findByAgent).toHaveBeenCalledWith('agent-uuid-1', query);
      expect(result).toBe(mockPaginated);
    });
  });

  describe('getSummary', () => {
    it('delegates to transactionsService.getSummary', async () => {
      const query = { period: 'monthly' as any };
      const result = await controller.getSummary(mockAgent as any, query);

      expect(transactionsService.getSummary).toHaveBeenCalledWith('agent-uuid-1', query);
      expect(result).toBe(mockSummary);
    });
  });
});
