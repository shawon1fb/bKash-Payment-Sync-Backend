import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import {
  createTestApp,
  generateToken,
  TestServices,
} from './helpers/test-app.factory';

const mockTx = {
  id: 'tx-uuid-1',
  transactionId: 'A2B3C4D5E6',
  amount: '1500.00',
  transactionTime: new Date().toISOString(),
  status: 'received',
  agentId: 'agent-uuid-1',
  senderPhone: '01711223344',
  receiverPhone: '01899887766',
  rawMessage: 'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM',
  createdAt: new Date().toISOString(),
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

describe('Transactions (e2e)', () => {
  let app: NestFastifyApplication;
  let services: TestServices;
  let jwtService: JwtService;
  let agentToken: string;

  beforeAll(async () => {
    ({ app, services, jwtService } = await createTestApp());

    agentToken = generateToken(jwtService, {
      sub: 'agent-uuid-1',
      phone: '01899887766',
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
      name: 'Agent One',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    services.transactionsService.upload.mockResolvedValue(mockTx as any);
    services.transactionsService.verify.mockResolvedValue(mockTx as any);
    services.transactionsService.updateStatus.mockResolvedValue({ ...mockTx, status: 'paid' } as any);
    services.transactionsService.findByAgent.mockResolvedValue(mockPaginated as any);
    services.transactionsService.getSummary.mockResolvedValue(mockSummary as any);
  });

  describe('POST /transactions/upload', () => {
    const VALID_SMS =
      'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM';

    it('returns 201 with transaction for valid SMS', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/upload')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ rawMessage: VALID_SMS })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBe('A2B3C4D5E6');
    });

    it('returns 400 when rawMessage too short', async () => {
      await request(app.getHttpServer())
        .post('/transactions/upload')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ rawMessage: 'short' })
        .expect(400);
    });

    it('returns 400 when rawMessage missing', async () => {
      await request(app.getHttpServer())
        .post('/transactions/upload')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(400);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/transactions/upload')
        .send({ rawMessage: VALID_SMS })
        .expect(401);
    });
  });

  describe('GET /transactions/verify/:transactionId', () => {
    it('returns 200 for public endpoint without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/verify/A2B3C4D5E6')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBe('A2B3C4D5E6');
    });

    it('returns 200 with token too', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/verify/A2B3C4D5E6')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.data.transactionId).toBe('A2B3C4D5E6');
    });
  });

  describe('PATCH /transactions/:transactionId/status', () => {
    it('returns 200 with updated status', async () => {
      const res = await request(app.getHttpServer())
        .patch('/transactions/A2B3C4D5E6/status')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'paid' })
        .expect(200);

      expect(res.body.data.status).toBe('paid');
    });

    it('returns 400 for invalid status value', async () => {
      await request(app.getHttpServer())
        .patch('/transactions/A2B3C4D5E6/status')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);
    });

    it('returns 400 for missing status', async () => {
      await request(app.getHttpServer())
        .patch('/transactions/A2B3C4D5E6/status')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(400);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/transactions/A2B3C4D5E6/status')
        .send({ status: 'paid' })
        .expect(401);
    });
  });

  describe('GET /transactions', () => {
    it('returns 200 with paginated transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/transactions').expect(401);
    });

    it('returns 400 for invalid page param', async () => {
      await request(app.getHttpServer())
        .get('/transactions?page=0')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(400);
    });
  });

  describe('GET /transactions/summary', () => {
    it('returns 200 with summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPaidAmount).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/transactions/summary').expect(401);
    });
  });
});
