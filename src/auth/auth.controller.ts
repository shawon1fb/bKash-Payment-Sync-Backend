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
  LoginResponseDto,
  RefreshResponseDto,
  MessageResponseDto,
} from './dto';
import { Public, CurrentUser, AuthRateLimit } from './decorators';
import { UserResponseDto } from '../users/dto';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../common';

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
    description: 'OTP sent successfully. Use the returned phone to call /auth/otp/verify.',
    type: SendOtpResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid or malformed phone number format.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid Bearer token.', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Too Many Requests — rate limit exceeded for OTP send attempts.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error — OTP generation or storage failed.', type: ErrorResponseDto })
  sendOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendOtpDto,
  ): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and get tokens',
    description:
      'Validates the 6-digit OTP sent to the provided phone number. On success, issues a JWT access token and refresh token. ' +
      'The OTP is single-use and expires after the configured TTL (default 5 minutes).',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified. Returns access token, refresh token, and user profile.',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid phone format or OTP length.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — OTP is invalid or has expired.', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Too Many Requests — too many failed verify attempts.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  verifyOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: VerifyOtpDto,
  ): Promise<AuthTokens> {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for a new access token and a rotated refresh token. ' +
      'The old refresh token is invalidated on use.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed. Returns new access token and rotated refresh token.',
    type: RefreshResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — refresh token missing or malformed.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — refresh token is invalid or expired.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  refresh(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description:
      'Ends the current session. The client must discard both the access token and refresh token. ' +
      'Server-side token invalidation depends on whether a token blacklist/Redis store is configured.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  logout(@CurrentUser() _user: UserResponseDto): { message: string } {
    return { message: 'Logged out successfully' };
  }
}
