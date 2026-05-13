import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Internal unique identifier of the transaction record',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'bKash transaction ID (TrxID) extracted from the SMS',
    example: 'A2B3C4D5E6',
  })
  @Expose()
  transactionId: string;

  @ApiProperty({
    description: 'Transaction amount in BDT as a decimal string',
    example: '1500.00',
  })
  @Expose()
  amount: string;

  @ApiProperty({
    description: 'Date and time the transaction occurred, as parsed from the SMS',
    format: 'date-time',
    example: '2026-05-12T14:30:00.000Z',
  })
  @Expose()
  transactionTime: Date;

  @ApiProperty({
    description:
      'Current status of the transaction. `received`: payment received by agent. `paid`: agent has paid out to the customer.',
    enum: ['received', 'paid'],
    enumName: 'TransactionStatus',
    example: 'received',
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: 'UUID of the agent who uploaded this transaction',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @Expose()
  agentId: string;

  @ApiProperty({ description: 'Name of the agent', example: 'John Doe', nullable: true })
  @Expose()
  agentName: string | null;

  @ApiProperty({
    description: 'Phone number of the sender extracted from the SMS. Null when not present in the message.',
    example: '01711223344',
    nullable: true,
  })
  @Expose()
  senderPhone: string | null;

  @ApiProperty({
    description: 'Phone number of the receiver extracted from the SMS',
    example: '01899887766',
  })
  @Expose()
  receiverPhone: string;

  @ApiProperty({
    description: 'Original raw bKash SMS text submitted by the agent',
    example: 'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM',
  })
  @Expose()
  rawMessage: string;

  @ApiProperty({
    description: 'Timestamp when the transaction record was created in the system',
    format: 'date-time',
    example: '2026-05-12T14:31:00.000Z',
  })
  @Expose()
  createdAt: Date;
}

export class SummaryResponseDto {
  @ApiProperty({
    description: 'Total transaction amount in BDT for the requested period',
    example: 125000.50,
  })
  totalPaidAmount: number;

  @ApiProperty({
    description: 'Total number of transactions in the requested period',
    example: 84,
  })
  totalTransactionCount: number;

  @ApiProperty({
    description: 'Period type used for the aggregation (daily, weekly, monthly, or custom)',
    example: 'monthly',
  })
  period: string;

  @ApiProperty({
    description: 'Start of the aggregation window (ISO 8601 date string)',
    example: '2026-05-01',
  })
  from: string;

  @ApiProperty({
    description: 'End of the aggregation window (ISO 8601 date string)',
    example: '2026-05-31',
  })
  to: string;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of matching records', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of records per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 15 })
  totalPages: number;

  @ApiProperty({ description: 'Whether a next page exists', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPreviousPage: boolean;
}

export class PaginatedTransactionResponseDto {
  @ApiProperty({
    description: 'Array of transactions for the current page',
    type: [TransactionResponseDto],
  })
  data: TransactionResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(
    data: TransactionResponseDto[],
    total: number,
    page: number,
    limit: number,
  ) {
    this.data = data;
    const totalPages = Math.ceil(total / limit);
    this.meta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
