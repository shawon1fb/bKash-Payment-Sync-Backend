import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TransactionStatus {
  RECEIVED = 'received',
  PAID = 'paid',
}

export class UpdateStatusDto {
  @ApiProperty({
    description:
      'New status for the transaction. `received`: payment received by agent. `paid`: agent has paid out to the customer.',
    enum: TransactionStatus,
    enumName: 'TransactionStatus',
    example: TransactionStatus.PAID,
  })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;
}
