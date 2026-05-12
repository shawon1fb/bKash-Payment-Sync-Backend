import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TransactionResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  transactionId: string;

  @ApiProperty()
  @Expose()
  amount: string;

  @ApiProperty()
  @Expose()
  transactionTime: Date;

  @ApiProperty({ enum: ['received', 'paid'] })
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  agentId: string;

  @ApiProperty({ nullable: true })
  @Expose()
  senderPhone: string | null;

  @ApiProperty()
  @Expose()
  receiverPhone: string;

  @ApiProperty()
  @Expose()
  rawMessage: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class SummaryResponseDto {
  @ApiProperty()
  totalPaidAmount: number;

  @ApiProperty()
  totalTransactionCount: number;

  @ApiProperty()
  period: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;
}

export class PaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedTransactionResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
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
