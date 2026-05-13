import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Full name of the agent',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Contact phone number of the agent (Bangladeshi format)',
    example: '01711223344',
    pattern: '^01[3-9]\\d{8}$',
  })
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'phone must be a valid BD number' })
  phone: string;
}
