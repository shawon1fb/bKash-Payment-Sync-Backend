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

export class PaginatedTransactionResponseDto {
  data: TransactionResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

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
