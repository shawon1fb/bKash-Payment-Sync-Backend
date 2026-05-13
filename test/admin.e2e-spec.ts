import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import {
  createTestApp,
  generateToken,
  TestServices,
} from './helpers/test-app.factory';

const mockAgent = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Agent One',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockPaginatedUsers = {
  data: [mockAgent],
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

describe('Admin (e2e)', () => {
  let app: NestFastifyApplication;
  let services: TestServices;
  let jwtService: JwtService;
  let adminToken: string;
  let agentToken: string;

  beforeAll(async () => {
    ({ app, services, jwtService } = await createTestApp());

    adminToken = generateToken(jwtService, {
      sub: '550e8400-e29b-41d4-a716-446655440002',
      phone: '01900000000',
      role: 'admin',
    });
    agentToken = generateToken(jwtService, {
      sub: '550e8400-e29b-41d4-a716-446655440001',
      phone: '01711223344',
      role: 'agent',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    services.authService.validateUser.mockImplementation((payload: any) => ({
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
      name: 'Test User',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    services.adminService.getAllTransactions.mockResolvedValue(mockPaginatedTxns as any);
    services.adminService.getSystemSummary.mockResolvedValue(mockSummary as any);
    services.adminService.listAgents.mockResolvedValue(mockPaginatedUsers as any);
    services.adminService.createAgent.mockResolvedValue(mockAgent as any);
    services.adminService.updateAgent.mockResolvedValue(mockAgent as any);
    services.adminService.deactivateAgent.mockResolvedValue({ ...mockAgent, isActive: false } as any);
    services.adminService.getAgentSummary.mockResolvedValue(mockSummary as any);
    services.adminService.getAgentTransactions.mockResolvedValue(mockPaginatedTxns as any);
  });

  // ── Transactions ────────────────────────────────────────────────────────────

  describe('GET /admin/transactions', () => {
    it('returns 200 for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 403 for agent', async () => {
      await request(app.getHttpServer())
        .get('/admin/transactions')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/admin/transactions').expect(401);
    });
  });

  describe('GET /admin/transactions/summary', () => {
    it('returns 200 with summary for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/transactions/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.totalPaidAmount).toBe(5000);
    });

    it('returns 403 for agent', async () => {
      await request(app.getHttpServer())
        .get('/admin/transactions/summary')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });

  // ── Agents ──────────────────────────────────────────────────────────────────

  describe('GET /admin/agents', () => {
    it('returns 200 with paginated agents for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .get('/admin/agents')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });

  describe('POST /admin/agents', () => {
    it('returns 201 with new agent for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Agent', phone: '01711223344' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Agent One');
    });

    it('returns 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '01711223344' })
        .expect(400);
    });

    it('returns 400 for invalid phone format', async () => {
      await request(app.getHttpServer())
        .post('/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Agent', phone: '123' })
        .expect(400);
    });

    it('returns 400 for name too short', async () => {
      await request(app.getHttpServer())
        .post('/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A', phone: '01711223344' })
        .expect(400);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .post('/admin/agents')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'New Agent', phone: '01711223344' })
        .expect(403);
    });
  });

  describe('PATCH /admin/agents/:id', () => {
    it('returns 200 when admin updates agent', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/agents/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Agent' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/admin/agents/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .patch('/admin/agents/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /admin/agents/:id', () => {
    it('returns 200 and deactivates agent', async () => {
      const res = await request(app.getHttpServer())
        .delete('/admin/agents/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .delete('/admin/agents/bad-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .delete('/admin/agents/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });

  describe('GET /admin/agents/:id/summary', () => {
    it('returns 200 with agent summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/agents/550e8400-e29b-41d4-a716-446655440001/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.totalPaidAmount).toBe(5000);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/admin/agents/bad-id/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 403 for agent', async () => {
      await request(app.getHttpServer())
        .get('/admin/agents/550e8400-e29b-41d4-a716-446655440001/summary')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });

  describe('GET /admin/agents/:id/transactions', () => {
    it('returns 200 with agent transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/agents/550e8400-e29b-41d4-a716-446655440001/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/admin/agents/bad-id/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 403 for agent', async () => {
      await request(app.getHttpServer())
        .get('/admin/agents/550e8400-e29b-41d4-a716-446655440001/transactions')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });
});
