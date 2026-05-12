import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and, gt, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { otpVerifications, users } from '../database/schema';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto';
import { AppConfig } from '../config/app.config';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfig,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const db = this.databaseService.getDatabase();
    const otp = this.generateOtp();
    const expiresAt = new Date(
      Date.now() + Number(this.appConfig.otpExpiresMinutes) * 60 * 1000,
    );

    await db.insert(otpVerifications).values({ phone, otp, expiresAt });

    if (this.appConfig.nodeEnv !== 'production') {
      console.log(`[OTP] phone=${phone} otp=${otp}`);
    }

    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string): Promise<AuthTokens> {
    const db = this.databaseService.getDatabase();

    const [record] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.phone, phone),
          eq(otpVerifications.otp, otp),
          eq(otpVerifications.isUsed, false),
          gt(otpVerifications.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, record.id));

    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('No account found for this phone. Contact admin.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.appConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto | null> {
    try {
      const user = await this.usersService.findOne(payload.sub);
      return user?.isActive ? user : null;
    } catch {
      return null;
    }
  }

  private async generateTokens(user: UserResponseDto): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtSecret,
        expiresIn: this.appConfig.jwtExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken, user };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
