import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { SummaryPeriod } from '../transactions/dto';

const mockUser = {
  id: 'user-uuid-1',
  name: 'Agent One',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPaginatedUsers = {
  data: [mockUser],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
};

const mockPaginatedTxns = {
  data: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
};

const mockSummary = {
  totalPaidAmount: 5000,
  totalTransactionCount: 10,
  period: 'monthly',
  from: '2026-05-01',
  to: '2026-05-31',
};

describe('AdminService', () => {
  let service: AdminService;
  let transactionsService: jest.Mocked<TransactionsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    transactionsService = {
      findByAgent: jest.fn().mockResolvedValue(mockPaginatedTxns),
      findAll: jest.fn().mockResolvedValue(mockPaginatedTxns),
      getSummary: jest.fn().mockResolvedValue(mockSummary),
    } as any;

    usersService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedUsers),
      create: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
      softDelete: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: TransactionsService, useValue: transactionsService },
        { provide: UsersService, useValue: usersService },
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getAllTransactions', () => {
    it('delegates to findByAgent when agentId provided', async () => {
      await service.getAllTransactions({ agentId: 'agent-uuid-1', page: 1, limit: 10 });

      expect(transactionsService.findByAgent).toHaveBeenCalledWith(
        'agent-uuid-1',
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('delegates to findAll when no agentId', async () => {
      await service.getAllTransactions({ page: 1, limit: 10 });

      expect(transactionsService.findAll).toHaveBeenCalled();
      expect(transactionsService.findByAgent).not.toHaveBeenCalled();
    });
  });

  describe('getSystemSummary', () => {
    it('calls getSummary with null agentId', async () => {
      await service.getSystemSummary({ period: SummaryPeriod.MONTHLY });

      expect(transactionsService.getSummary).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ period: SummaryPeriod.MONTHLY }),
      );
    });
  });

  describe('getAgentSummary', () => {
    it('calls getSummary with the given agentId', async () => {
      await service.getAgentSummary('agent-uuid-1', { period: SummaryPeriod.DAILY });

      expect(transactionsService.getSummary).toHaveBeenCalledWith(
        'agent-uuid-1',
        expect.objectContaining({ period: SummaryPeriod.DAILY }),
      );
    });
  });

  describe('getAgentTransactions', () => {
    it('delegates to transactionsService.findByAgent', async () => {
      await service.getAgentTransactions('agent-uuid-1', { page: 1, limit: 10 });

      expect(transactionsService.findByAgent).toHaveBeenCalledWith(
        'agent-uuid-1',
        expect.anything(),
      );
    });
  });

  describe('listAgents', () => {
    it('calls usersService.findAll with role=agent', async () => {
      await service.listAgents({ page: 1, limit: 10 });

      expect(usersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'agent' }),
      );
    });
  });

  describe('createAgent', () => {
    it('calls usersService.create with role=agent', async () => {
      await service.createAgent({ name: 'New Agent', phone: '01711223344' });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'agent', name: 'New Agent' }),
      );
    });
  });

  describe('updateAgent', () => {
    it('delegates to usersService.update', async () => {
      await service.updateAgent('agent-uuid-1', { name: 'Updated' });

      expect(usersService.update).toHaveBeenCalledWith('agent-uuid-1', { name: 'Updated' });
    });
  });

  describe('deactivateAgent', () => {
    it('delegates to usersService.softDelete', async () => {
      const result = await service.deactivateAgent('agent-uuid-1');

      expect(usersService.softDelete).toHaveBeenCalledWith('agent-uuid-1');
      expect(result.isActive).toBe(false);
    });
  });
});
