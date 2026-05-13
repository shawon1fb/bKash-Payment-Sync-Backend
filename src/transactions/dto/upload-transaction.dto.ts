import { IsString, MinLength, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadTransactionDto {
  @ApiProperty({
    description: 'Raw bKash SMS message',
    example:
      'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM',
  })
  @IsString()
  @MinLength(10)
  rawMessage: string;

  @ApiPropertyOptional({
    description: 'Agent UUID — required when caller has admin role. Ignored for agent callers (own ID used automatically).',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
