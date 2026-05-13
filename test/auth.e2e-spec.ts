import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  createTestApp,
  generateToken,
  TestServices,
} from './helpers/test-app.factory';
import { JwtService } from '@nestjs/jwt';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let services: TestServices;
  let jwtService: JwtService;
  let agentToken: string;

  beforeAll(async () => {
    ({ app, services, jwtService } = await createTestApp());
    agentToken = generateToken(jwtService, {
      sub: 'agent-uuid-1',
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
  });

  describe('POST /auth/otp/send', () => {
    it('returns 200 with success response for valid phone', async () => {
      services.authService.sendOtp.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
        phone: '01711223344',
        expiresInMinutes: 5,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: '01711223344' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('01711223344');
    });

    it('returns 400 for invalid phone format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing phone', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('returns 200 with tokens on valid OTP', async () => {
      const mockUser = { id: 'user-uuid-1', name: 'John', phone: '01711223344', role: 'agent', isActive: true, createdAt: new Date(), updatedAt: new Date() };
      services.authService.verifyOtp.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: '01711223344', otp: '123456' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('access-token');
    });

    it('returns 400 for OTP length != 6', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: '01711223344', otp: '123' })
        .expect(400);
    });

    it('returns 400 for invalid phone', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: 'bad', otp: '123456' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with new tokens', async () => {
      services.authService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'some-refresh-token' })
        .expect(200);

      expect(res.body.data.accessToken).toBe('new-access');
    });

    it('returns 400 when refreshToken missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 with logout message for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});
