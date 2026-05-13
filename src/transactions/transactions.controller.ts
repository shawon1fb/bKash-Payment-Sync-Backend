import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  UploadTransactionDto,
  UpdateStatusDto,
  TransactionQueryDto,
  SummaryQueryDto,
  TransactionResponseDto,
  SummaryResponseDto,
  PaginatedTransactionResponseDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';
import { UserResponseDto } from '../users/dto';
import { Public } from '../auth/decorators';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../common';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload bKash SMS transaction',
    description:
      'Parses a raw bKash SMS message and persists the transaction record linked to the authenticated agent. ' +
      'The parser extracts TrxID, amount, sender/receiver phone, and timestamp from the SMS text.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction parsed and created successfully.',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — raw message too short or malformed.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Conflict — transaction with this TrxID already exists.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  upload(
    @CurrentUser() user: UserResponseDto,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UploadTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.upload(user.id, user.phone, dto);
  }

  @Get('verify/:transactionId')
  @Public()
  @ApiOperation({
    summary: 'Verify transaction by TrxID',
    description:
      'Public endpoint. Looks up a transaction by its bKash TrxID and returns full details. ' +
      'Used by merchants or third parties to confirm payment receipt without authentication.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'bKash transaction ID (TrxID) from the SMS, e.g. "A2B3C4D5E6"',
    example: 'A2B3C4D5E6',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction found and returned.',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Not found — no transaction with this TrxID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  verify(
    @Param('transactionId') transactionId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.verify(transactionId);
  }

  @Patch(':transactionId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update transaction status',
    description:
      'Allows the owning agent to update the status of their transaction from `received` to `paid`. ' +
      'Only the agent who uploaded the transaction can update its status.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'bKash transaction ID (TrxID)',
    example: 'A2B3C4D5E6',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status updated and returned.',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid status value.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller is not the owner of this transaction.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no transaction with this TrxID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  updateStatus(
    @CurrentUser() user: UserResponseDto,
    @Param('transactionId') transactionId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateStatusDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.updateStatus(transactionId, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List own transactions',
    description:
      'Returns a paginated list of transactions uploaded by the authenticated agent. ' +
      'Supports filtering by status and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of transactions for the authenticated agent.',
    type: PaginatedTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  findAll(
    @CurrentUser() user: UserResponseDto,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.transactionsService.findByAgent(user.id, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Own transaction summary',
    description:
      'Returns aggregate totals (count and amount) for the authenticated agent\'s transactions ' +
      'over the requested period. Supports daily, weekly, monthly, or custom date ranges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary aggregates for the requested period.',
    type: SummaryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters or missing from/to for custom period.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getSummary(
    @CurrentUser() user: UserResponseDto,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.transactionsService.getSummary(user.id, query);
  }
}
