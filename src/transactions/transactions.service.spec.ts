import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus, SummaryPeriod } from './dto';

function mockDb(...results: any[]) {
  let i = 0;
  const self: any = {};
  for (const m of [
    'select', 'from', 'where', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'update', 'set', 'delete',
  ]) {
    self[m] = jest.fn(() => self);
  }
  self.then = (resolve: any, reject?: any) =>
    Promise.resolve(results[i++] ?? []).then(resolve, reject);
  return self;
}

const baseTx = {
  id: 'tx-uuid-1',
  transactionId: 'A2B3C4D5E6',
  amount: '1500.00',
  transactionTime: new Date('2026-05-12T14:30:00Z'),
  status: 'received',
  agentId: 'agent-uuid-1',
  senderPhone: '01711223344',
  receiverPhone: '01899887766',
  rawMessage: 'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM',
  createdAt: new Date('2026-05-12T14:31:00Z'),
};

const VALID_SMS =
  'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let databaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    databaseService = { getDatabase: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('upload', () => {
    it('parses SMS, inserts, and returns dto', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([], [baseTx]) as any);

      const result = await service.upload('agent-uuid-1', '01899887766', {
        rawMessage: VALID_SMS,
      });

      expect(result.transactionId).toBe('A2B3C4D5E6');
      expect(result.amount).toBe('1500.00');
    });

    it('throws BadRequestException for unparseable SMS', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb() as any);

      await expect(
        service.upload('agent-uuid-1', '01899887766', {
          rawMessage: 'gibberish text',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for duplicate TrxID', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ id: 'existing-tx' }]) as any,
      );

      await expect(
        service.upload('agent-uuid-1', '01899887766', { rawMessage: VALID_SMS }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verify', () => {
    it('returns transaction dto when found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([baseTx]) as any);

      const result = await service.verify('A2B3C4D5E6');

      expect(result.transactionId).toBe('A2B3C4D5E6');
    });

    it('throws NotFoundException when not found', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(service.verify('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns dto', async () => {
      const updated = { ...baseTx, status: 'paid' };
      databaseService.getDatabase.mockReturnValue(mockDb([baseTx], [updated]) as any);

      const result = await service.updateStatus('A2B3C4D5E6', 'agent-uuid-1', {
        status: TransactionStatus.PAID,
      });

      expect(result.status).toBe('paid');
    });

    it('throws NotFoundException when tx not found for agent', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(
        service.updateStatus('NOTEXIST', 'agent-uuid-1', {
          status: TransactionStatus.PAID,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAgent', () => {
    it('returns paginated result for agent', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ total: 1 }], [baseTx]) as any,
      );

      const result = await service.findByAgent('agent-uuid-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findAll', () => {
    it('returns paginated result for all transactions', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ total: 2 }], [baseTx, { ...baseTx, id: 'tx-uuid-2' }]) as any,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getSummary', () => {
    const summaryRow = { total: 5, totalAmount: '7500.00' };

    it('returns monthly summary by default', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([summaryRow]) as any);

      const result = await service.getSummary('agent-uuid-1', {
        period: SummaryPeriod.MONTHLY,
      });

      expect(result.totalTransactionCount).toBe(5);
      expect(result.totalPaidAmount).toBeCloseTo(7500);
      expect(result.period).toBe('monthly');
    });

    it('returns daily summary', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([summaryRow]) as any);

      const result = await service.getSummary(null, { period: SummaryPeriod.DAILY });

      expect(result.period).toBe('daily');
    });

    it('returns weekly summary', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([summaryRow]) as any);

      const result = await service.getSummary(null, { period: SummaryPeriod.WEEKLY });

      expect(result.period).toBe('weekly');
    });

    it('returns custom range summary', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([summaryRow]) as any);

      const from = new Date('2026-05-01');
      const to = new Date('2026-05-31');

      const result = await service.getSummary(null, {
        period: SummaryPeriod.CUSTOM,
        from,
        to,
      });

      expect(result.period).toBe('custom');
      expect(result.from).toBe('2026-05-01');
    });

    it('throws BadRequestException for custom period without from/to', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb() as any);

      await expect(
        service.getSummary(null, { period: SummaryPeriod.CUSTOM }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns zero when no paid transactions exist', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([{ total: 0, totalAmount: null }]) as any,
      );

      const result = await service.getSummary(null, { period: SummaryPeriod.MONTHLY });

      expect(result.totalPaidAmount).toBe(0);
      expect(result.totalTransactionCount).toBe(0);
    });
  });
});
