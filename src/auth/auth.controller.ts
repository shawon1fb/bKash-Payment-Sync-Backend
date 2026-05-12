import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthTokens } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto';
import { Public, CurrentUser } from './decorators';
import { UserResponseDto } from '../users/dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  sendOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendOtpDto,
  ): Promise<{ message: string }> {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: VerifyOtpDto,
  ): Promise<AuthTokens> {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  refresh(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client should discard tokens)' })
  @ApiResponse({ status: 200 })
  logout(@CurrentUser() _user: UserResponseDto): { message: string } {
    return { message: 'Logged out successfully' };
  }
}
