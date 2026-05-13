import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description:
      'Target mobile phone number to receive the OTP. Must be a valid Bangladeshi mobile number in the 01XXXXXXXX format.',
    example: '01711223344',
    minLength: 11,
    maxLength: 11,
    pattern: '^01[3-9]\\d{8}$',
  })
  @IsString()
  @Length(11, 11, { message: 'phone must be exactly 11 characters' })
  @Matches(/^01[3-9]\d{8}$/, { message: 'phone must be a valid BD number' })
  phone: string;
}
