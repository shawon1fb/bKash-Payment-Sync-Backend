import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockUser = {
  id: 'user-uuid-1',
  name: 'John Doe',
  phone: '01711223344',
  role: 'agent',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: mockUser,
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      refreshTokens: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('sendOtp', () => {
    it('delegates to authService.sendOtp', async () => {
      const response = { success: true, message: 'OTP sent', phone: '01711223344', expiresInMinutes: 5 };
      authService.sendOtp.mockResolvedValue(response);

      const result = await controller.sendOtp({ phone: '01711223344' });

      expect(authService.sendOtp).toHaveBeenCalledWith('01711223344');
      expect(result).toBe(response);
    });
  });

  describe('verifyOtp', () => {
    it('delegates to authService.verifyOtp', async () => {
      authService.verifyOtp.mockResolvedValue(mockTokens as any);

      const result = await controller.verifyOtp({ phone: '01711223344', otp: '123456' });

      expect(authService.verifyOtp).toHaveBeenCalledWith('01711223344', '123456');
      expect(result).toBe(mockTokens);
    });
  });

  describe('refresh', () => {
    it('delegates to authService.refreshTokens', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      authService.refreshTokens.mockResolvedValue(tokens);

      const result = await controller.refresh({ refreshToken: 'old-refresh' });

      expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(result).toBe(tokens);
    });
  });

  describe('logout', () => {
    it('returns logout message', () => {
      const result = controller.logout(mockUser as any);

      expect(result.message).toContain('Logged out');
    });
  });
});
