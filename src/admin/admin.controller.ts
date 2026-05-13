import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminTransactionQueryDto, CreateAgentDto } from './dto';
import {
  SummaryQueryDto,
  SummaryResponseDto,
  PaginatedTransactionResponseDto,
} from '../transactions/dto';
import {
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
  UpdateUserDto,
} from '../users/dto';
import { Roles } from '../auth/decorators';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Transactions ─────────────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'All transactions (filterable by agent)' })
  @ApiResponse({ status: 200, type: PaginatedTransactionResponseDto })
  getAllTransactions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.adminService.getAllTransactions(query);
  }

  @Get('transactions/summary')
  @ApiOperation({ summary: 'System-wide summary' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  getSystemSummary(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.adminService.getSystemSummary(query);
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  @Get('agents')
  @ApiOperation({ summary: 'List all agents' })
  @ApiResponse({ status: 200, type: PaginatedUserResponseDto })
  listAgents(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryUserDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.adminService.listAgents(query);
  }

  @Post('agents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create agent' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  createAgent(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateAgentDto,
  ): Promise<UserResponseDto> {
    return this.adminService.createAgent(dto);
  }

  @Patch('agents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update agent name or status' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.adminService.updateAgent(id, dto);
  }

  @Delete('agents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate agent' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  deactivateAgent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.adminService.deactivateAgent(id);
  }

  @Get('agents/:id/summary')
  @ApiOperation({ summary: 'Agent-wise summary' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  getAgentSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.adminService.getAgentSummary(id, query);
  }

  @Get('agents/:id/transactions')
  @ApiOperation({ summary: 'Specific agent transactions' })
  @ApiResponse({ status: 200, type: PaginatedTransactionResponseDto })
  getAgentTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.adminService.getAgentTransactions(id, query);
  }
}
