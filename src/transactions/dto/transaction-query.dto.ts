import { IsOptional, IsNumber, Min, Max, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from './update-status.dto';

export enum SummaryPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 10, minimum: 1, maximum: 500, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by transaction status', enum: TransactionStatus, enumName: 'TransactionStatus' })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'Filter from this date (ISO 8601)', example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Filter up to this date (ISO 8601)', example: '2026-05-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class SummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Aggregation period. Use `custom` with `from` and `to` for a specific date range.',
    enum: SummaryPeriod,
    enumName: 'SummaryPeriod',
    default: SummaryPeriod.MONTHLY,
  })
  @IsOptional()
  @IsEnum(SummaryPeriod)
  period?: SummaryPeriod = SummaryPeriod.MONTHLY;

  @ApiPropertyOptional({ description: 'Start of custom date range (ISO 8601). Required when period=custom.', example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'End of custom date range (ISO 8601). Required when period=custom.', example: '2026-05-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
