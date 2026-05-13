import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { AppConfig } from '../config/app.config';

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

const activeUser = {
  id: 'user-uuid-1',
  name: 'John Doe',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const validOtpRecord = {
  id: 'otp-uuid-1',
  phone: '01711223344',
  otp: '123456',
  isUsed: false,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let databaseService: jest.Mocked<DatabaseService>;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockAppConfig = {
    nodeEnv: 'test',
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtExpiresIn: '1h',
    jwtRefreshExpiresIn: '7d',
    otpExpiresMinutes: 5,
  } as AppConfig;

  beforeEach(async () => {
    databaseService = { getDatabase: jest.fn() } as any;
    usersService = {
      findByPhone: jest.fn(),
      findOne: jest.fn(),
    } as any;
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verify: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: AppConfig, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendOtp', () => {
    it('inserts OTP and returns success response', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      const result = await service.sendOtp('01711223344');

      expect(result.success).toBe(true);
      expect(result.phone).toBe('01711223344');
      expect(result.expiresInMinutes).toBe(5);
    });
  });

  describe('verifyOtp', () => {
    it('returns tokens for valid OTP and active user', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([validOtpRecord], []) as any,
      );
      usersService.findByPhone.mockResolvedValue(activeUser as any);

      const result = await service.verifyOtp('01711223344', '123456');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.id).toBe(activeUser.id);
    });

    it('throws BadRequestException for invalid/expired OTP', async () => {
      databaseService.getDatabase.mockReturnValue(mockDb([]) as any);

      await expect(service.verifyOtp('01711223344', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws UnauthorizedException when user not found', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([validOtpRecord], []) as any,
      );
      usersService.findByPhone.mockResolvedValue(null);

      await expect(service.verifyOtp('01711223344', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for inactive user', async () => {
      databaseService.getDatabase.mockReturnValue(
        mockDb([validOtpRecord], []) as any,
      );
      usersService.findByPhone.mockResolvedValue({ ...activeUser, isActive: false } as any);

      await expect(service.verifyOtp('01711223344', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('returns new tokens for valid refresh token', async () => {
      const payload = { sub: 'user-uuid-1', phone: '01711223344', role: 'agent' };
      jwtService.verify.mockReturnValue(payload as any);
      usersService.findOne.mockResolvedValue(activeUser as any);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('throws UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'gone-id' } as any);
      usersService.findOne.mockResolvedValue(null as any);

      await expect(service.refreshTokens('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for inactive user', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' } as any);
      usersService.findOne.mockResolvedValue({ ...activeUser, isActive: false } as any);

      await expect(service.refreshTokens('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('returns user for active account', async () => {
      usersService.findOne.mockResolvedValue(activeUser as any);

      const result = await service.validateUser({
        sub: 'user-uuid-1',
        phone: '01711223344',
        role: 'agent',
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-uuid-1');
    });

    it('returns null for inactive account', async () => {
      usersService.findOne.mockResolvedValue({ ...activeUser, isActive: false } as any);

      const result = await service.validateUser({
        sub: 'user-uuid-1',
        phone: '01711223344',
        role: 'agent',
      });

      expect(result).toBeNull();
    });

    it('returns null when findOne throws', async () => {
      usersService.findOne.mockRejectedValue(new Error('not found'));

      const result = await service.validateUser({
        sub: 'bad-id',
        phone: '01711223344',
        role: 'agent',
      });

      expect(result).toBeNull();
    });
  });
});
