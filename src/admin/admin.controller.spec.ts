import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SummaryPeriod } from '../transactions/dto';

const mockUser = {
  id: 'agent-uuid-1',
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

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    adminService = {
      getAllTransactions: jest.fn().mockResolvedValue(mockPaginatedTxns),
      getSystemSummary: jest.fn().mockResolvedValue(mockSummary),
      listAgents: jest.fn().mockResolvedValue(mockPaginatedUsers),
      createAgent: jest.fn().mockResolvedValue(mockUser),
      updateAgent: jest.fn().mockResolvedValue(mockUser),
      deactivateAgent: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
      getAgentSummary: jest.fn().mockResolvedValue(mockSummary),
      getAgentTransactions: jest.fn().mockResolvedValue(mockPaginatedTxns),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('getAllTransactions', () => {
    it('delegates to adminService.getAllTransactions', async () => {
      const query = { page: 1, limit: 10 };
      await controller.getAllTransactions(query as any);
      expect(adminService.getAllTransactions).toHaveBeenCalledWith(query);
    });
  });

  describe('getSystemSummary', () => {
    it('delegates to adminService.getSystemSummary', async () => {
      const query = { period: SummaryPeriod.MONTHLY };
      await controller.getSystemSummary(query);
      expect(adminService.getSystemSummary).toHaveBeenCalledWith(query);
    });
  });

  describe('listAgents', () => {
    it('delegates to adminService.listAgents', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.listAgents(query as any);
      expect(adminService.listAgents).toHaveBeenCalledWith(query);
      expect(result).toBe(mockPaginatedUsers);
    });
  });

  describe('createAgent', () => {
    it('delegates to adminService.createAgent', async () => {
      const dto = { name: 'New Agent', phone: '01711223344' };
      const result = await controller.createAgent(dto);
      expect(adminService.createAgent).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockUser);
    });
  });

  describe('updateAgent', () => {
    it('delegates to adminService.updateAgent', async () => {
      const dto = { name: 'Updated', isActive: false };
      await controller.updateAgent('agent-uuid-1', dto);
      expect(adminService.updateAgent).toHaveBeenCalledWith('agent-uuid-1', dto);
    });
  });

  describe('deactivateAgent', () => {
    it('delegates to adminService.deactivateAgent', async () => {
      const result = await controller.deactivateAgent('agent-uuid-1');
      expect(adminService.deactivateAgent).toHaveBeenCalledWith('agent-uuid-1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('getAgentSummary', () => {
    it('delegates to adminService.getAgentSummary', async () => {
      const query = { period: SummaryPeriod.DAILY };
      await controller.getAgentSummary('agent-uuid-1', query);
      expect(adminService.getAgentSummary).toHaveBeenCalledWith('agent-uuid-1', query);
    });
  });

  describe('getAgentTransactions', () => {
    it('delegates to adminService.getAgentTransactions', async () => {
      const query = { page: 1, limit: 10 };
      await controller.getAgentTransactions('agent-uuid-1', query as any);
      expect(adminService.getAgentTransactions).toHaveBeenCalledWith('agent-uuid-1', query);
    });
  });
});
