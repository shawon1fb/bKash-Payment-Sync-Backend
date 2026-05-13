import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Bangladeshi mobile number that received the OTP',
    example: '01711223344',
    minLength: 11,
    maxLength: 11,
    pattern: '^01[3-9]\\d{8}$',
  })
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'phone must be a valid BD number' })
  phone: string;

  @ApiProperty({
    description: '6-digit one-time password sent to the phone number',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    pattern: '^\\d{6}$',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}
