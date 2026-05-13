import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, AuthTokens } from './auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  SendOtpResponseDto,
} from './dto';
import { Public, CurrentUser, AuthRateLimit } from './decorators';
import { UserResponseDto } from '../users/dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @Public()
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to phone number',
    description:
      'Initiates an OTP (One-Time Password) verification flow by sending a unique 6-digit code to the provided Bangladeshi mobile number. ' +
      'The OTP expires after a configurable duration (default 5 minutes). ' +
      'Use the returned phone number to call POST /auth/otp/verify and complete authentication. ' +
      'In non-production environments, the OTP is logged to the console for testing purposes.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: SendOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request — invalid or malformed phone number format',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized — missing or invalid Bearer token when required by global guard',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests — rate limit exceeded for OTP send attempts',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error — unexpected server error during OTP generation or storage',
  })
  sendOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendOtpDto,
  ): Promise<SendOtpResponseDto> {
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
