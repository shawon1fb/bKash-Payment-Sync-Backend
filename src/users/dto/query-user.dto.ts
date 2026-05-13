import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from './create-user.dto';
import { UserResponseDto } from './user-response.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum UserSortField {
  CREATED_AT = 'createdAt',
  NAME = 'name',
}

export class QueryUserDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 10, minimum: 1, maximum: 100, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Full-text search on user name', example: 'john' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user role', enum: UserRole, enumName: 'UserRole' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by account active status', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    enum: UserSortField,
    enumName: 'UserSortField',
    default: UserSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortField)
  sortBy?: UserSortField = UserSortField.CREATED_AT;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder, enumName: 'SortOrder', default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class UserPaginationMetaDto {
  @ApiProperty({ description: 'Total number of matching records', example: 50 }) total: number;
  @ApiProperty({ description: 'Current page number (1-based)', example: 1 }) page: number;
  @ApiProperty({ description: 'Number of records per page', example: 10 }) limit: number;
  @ApiProperty({ description: 'Total number of pages', example: 5 }) totalPages: number;
  @ApiProperty({ description: 'Whether a next page exists', example: true }) hasNextPage: boolean;
  @ApiProperty({ description: 'Whether a previous page exists', example: false }) hasPreviousPage: boolean;
}

export class PaginatedUserResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: UserPaginationMetaDto })
  meta: UserPaginationMetaDto;

  constructor(
    data: UserResponseDto[],
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
