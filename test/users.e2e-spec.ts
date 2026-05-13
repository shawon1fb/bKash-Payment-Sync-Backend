import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import {
  createTestApp,
  generateToken,
  TestServices,
} from './helpers/test-app.factory';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const ADMIN_UUID = '550e8400-e29b-41d4-a716-446655440002';

const mockUser = {
  id: USER_UUID,
  name: 'John Doe',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockPaginated = {
  data: [mockUser],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
};

describe('Users (e2e)', () => {
  let app: NestFastifyApplication;
  let services: TestServices;
  let jwtService: JwtService;
  let agentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ app, services, jwtService } = await createTestApp());

    agentToken = generateToken(jwtService, {
      sub: USER_UUID,
      phone: '01711223344',
      role: 'agent',
    });
    adminToken = generateToken(jwtService, {
      sub: ADMIN_UUID,
      phone: '01900000000',
      role: 'admin',
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
    services.usersService.findOne.mockResolvedValue(mockUser as any);
    services.usersService.update.mockResolvedValue(mockUser as any);
    services.usersService.findAll.mockResolvedValue(mockPaginated as any);
  });

  describe('GET /users/profile', () => {
    it('returns 200 with user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });
  });

  describe('PATCH /users/profile', () => {
    it('returns 200 when name updated', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 400 for name too short', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('GET /users (admin)', () => {
    it('returns 200 paginated users for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('GET /users/:id (admin)', () => {
    it('returns 200 with user for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /users/:id (admin)', () => {
    it('returns 200 when admin updates user', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 403 for agent role', async () => {
      await request(app.getHttpServer())
        .patch('/users/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('returns 400 for invalid isActive type', async () => {
      await request(app.getHttpServer())
        .patch('/users/550e8400-e29b-41d4-a716-446655440001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'yes' })
        .expect(400);
    });
  });
});
