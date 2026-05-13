import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from './update-status.dto';

export enum SummaryPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  from?: Date;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  to?: Date;
}

export class SummaryQueryDto {
  @ApiPropertyOptional({ enum: SummaryPeriod, default: SummaryPeriod.MONTHLY })
  @IsOptional()
  @IsEnum(SummaryPeriod)
  period?: SummaryPeriod = SummaryPeriod.MONTHLY;

  @ApiPropertyOptional({
    example: '2026-05-01',
    description: 'Required when period=custom',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  from?: Date;

  @ApiPropertyOptional({
    example: '2026-05-31',
    description: 'Required when period=custom',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  to?: Date;
}
