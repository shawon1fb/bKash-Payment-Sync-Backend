import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TransactionStatus {
  RECEIVED = 'received',
  PAID = 'paid',
}

export class UpdateStatusDto {
  @ApiProperty({ enum: TransactionStatus, example: 'paid' })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;
}
