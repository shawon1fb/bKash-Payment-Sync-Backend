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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload bKash SMS transaction (agent)' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  upload(
    @CurrentUser() user: UserResponseDto,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UploadTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.upload(user.id, dto);
  }

  @Get('verify/:transactionId')
  @Public()
  @ApiOperation({ summary: 'Verify transaction by TrxID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  verify(@Param('transactionId') transactionId: string): Promise<TransactionResponseDto> {
    return this.transactionsService.verify(transactionId);
  }

  @Patch(':transactionId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update transaction status (agent)' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  updateStatus(
    @CurrentUser() user: UserResponseDto,
    @Param('transactionId') transactionId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateStatusDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.updateStatus(transactionId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own transactions (agent)' })
  @ApiResponse({ status: 200, type: PaginatedTransactionResponseDto })
  findAll(
    @CurrentUser() user: UserResponseDto,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.transactionsService.findByAgent(user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Own transaction summary (agent)' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  getSummary(
    @CurrentUser() user: UserResponseDto,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.transactionsService.getSummary(user.id, query);
  }
}
