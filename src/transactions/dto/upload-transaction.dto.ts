import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadTransactionDto {
  @ApiProperty({
    description: 'Raw bKash SMS message',
    example:
      'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM',
  })
  @IsString()
  @MinLength(10)
  rawMessage: string;
}
