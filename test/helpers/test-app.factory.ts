import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthController } from '../../src/auth/auth.controller';
import { UsersController } from '../../src/users/users.controller';
import { TransactionsController } from '../../src/transactions/transactions.controller';
import { AdminController } from '../../src/admin/admin.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { TransactionsService } from '../../src/transactions/transactions.service';
import { AdminService } from '../../src/admin/admin.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { AppConfig } from '../../src/config/app.config';
import {
  CustomValidationPipe,
  GlobalExceptionFilter,
  TransformInterceptor,
} from '../../src/common';

export const TEST_JWT_SECRET = 'e2e-test-jwt-secret-key';
export const TEST_JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-key';

export const mockAppConfig: Partial<AppConfig> = {
  nodeEnv: 'test' as any,
  jwtSecret: TEST_JWT_SECRET,
  jwtRefreshSecret: TEST_JWT_REFRESH_SECRET,
  jwtExpiresIn: '1h',
  jwtRefreshExpiresIn: '7d',
  otpExpiresMinutes: 5,
  rateLimitTtl: 60,
  rateLimitLimit: 100,
  bcryptRounds: 10,
};

export function createMockAuthService() {
  return {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    refreshTokens: jest.fn(),
    validateUser: jest.fn(),
  };
}

export function createMockUsersService() {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPhone: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    remove: jest.fn(),
  };
}

export function createMockTransactionsService() {
  return {
    upload: jest.fn(),
    verify: jest.fn(),
    updateStatus: jest.fn(),
    findByAgent: jest.fn(),
    findAll: jest.fn(),
    getSummary: jest.fn(),
  };
}

export function createMockAdminService() {
  return {
    getAllTransactions: jest.fn(),
    getSystemSummary: jest.fn(),
    listAgents: jest.fn(),
    createAgent: jest.fn(),
    updateAgent: jest.fn(),
    deactivateAgent: jest.fn(),
    getAgentSummary: jest.fn(),
    getAgentTransactions: jest.fn(),
  };
}

export interface TestServices {
  authService: ReturnType<typeof createMockAuthService>;
  usersService: ReturnType<typeof createMockUsersService>;
  transactionsService: ReturnType<typeof createMockTransactionsService>;
  adminService: ReturnType<typeof createMockAdminService>;
}

export async function createTestApp(): Promise<{
  app: NestFastifyApplication;
  services: TestServices;
  jwtService: JwtService;
}> {
  const services: TestServices = {
    authService: createMockAuthService(),
    usersService: createMockUsersService(),
    transactionsService: createMockTransactionsService(),
    adminService: createMockAdminService(),
  };

  // validateUser returns a user based on the JWT payload role
  services.authService.validateUser.mockImplementation((payload: any) => ({
    id: payload.sub,
    phone: payload.phone,
    role: payload.role,
    name: 'Test User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: TEST_JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
      CacheModule.register({ isGlobal: true }),
    ],
    controllers: [
      AuthController,
      UsersController,
      TransactionsController,
      AdminController,
    ],
    providers: [
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      JwtStrategy,
      { provide: AppConfig, useValue: mockAppConfig },
      { provide: AuthService, useValue: services.authService },
      { provide: UsersService, useValue: services.usersService },
      { provide: TransactionsService, useValue: services.transactionsService },
      { provide: AdminService, useValue: services.adminService },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const jwtService = moduleFixture.get<JwtService>(JwtService);

  return { app, services, jwtService };
}

export function generateToken(
  jwtService: JwtService,
  payload: { sub: string; phone: string; role: 'agent' | 'admin' },
): string {
  return jwtService.sign(payload, { secret: TEST_JWT_SECRET });
}
