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
  ParseIntPipe,
  ValidationPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminTransactionQueryDto, CreateAgentDto, TopAgentResponseDto } from './dto';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../common';
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
  @ApiOperation({
    summary: 'All transactions (filterable by agent)',
    description:
      'Admin only. Returns a paginated list of all transactions in the system. ' +
      'Optionally filter by agent UUID, status, or date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all transactions.',
    type: PaginatedTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getAllTransactions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.adminService.getAllTransactions(query);
  }

  @Get('transactions/summary')
  @ApiOperation({
    summary: 'System-wide transaction summary',
    description:
      'Admin only. Returns aggregate totals (count and amount) across all agents for the requested period. ' +
      'Supports daily, weekly, monthly, or custom date ranges.',
  })
  @ApiResponse({
    status: 200,
    description: 'System-wide summary aggregates for the requested period.',
    type: SummaryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters or missing from/to for custom period.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getSystemSummary(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.adminService.getSystemSummary(query);
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  @Get('agents/:id')
  @ApiOperation({ summary: 'Get agent by ID', description: 'Admin only. Returns a single agent by UUID.' })
  @ApiParam({ name: 'id', description: 'Agent UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Agent found.', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no agent with this ID.', type: ErrorResponseDto })
  getAgent(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.adminService.getAgent(id);
  }

  @Get('agents/top')
  @ApiOperation({
    summary: 'Top agents by paid amount',
    description: 'Admin only. Returns top N agents ranked by total paid transaction amount.',
  })
  @ApiResponse({ status: 200, description: 'Top agents list.', type: [TopAgentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  getTopAgents(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<TopAgentResponseDto[]> {
    return this.adminService.getTopAgents(limit);
  }

  @Get('agents')
  @ApiOperation({
    summary: 'List all agents',
    description:
      'Admin only. Returns a paginated, filterable list of all users with the `agent` role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of agents.',
    type: PaginatedUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  listAgents(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryUserDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.adminService.listAgents(query);
  }

  @Post('agents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create agent',
    description:
      'Creates a new agent account in the system with the provided name and phone number. Requires admin role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Agent successfully created and returned.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid request body.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Conflict — phone number already registered.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  createAgent(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateAgentDto,
  ): Promise<UserResponseDto> {
    return this.adminService.createAgent(dto);
  }

  @Patch('agents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update agent',
    description: 'Admin only. Updates an agent\'s name and/or active status by UUID.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Agent updated and returned.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid field values.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no agent with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  updateAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.adminService.updateAgent(id, dto);
  }

  @Delete('agents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate agent',
    description:
      'Admin only. Sets the agent\'s `isActive` flag to false. The agent account is retained but cannot log in.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Agent deactivated and returned with updated status.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no agent with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  deactivateAgent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.adminService.deactivateAgent(id);
  }

  @Get('agents/:id/summary')
  @ApiOperation({
    summary: 'Agent transaction summary',
    description:
      'Admin only. Returns aggregate totals (count and amount) for a specific agent\'s transactions over the requested period.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Summary aggregates for the requested agent and period.',
    type: SummaryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters or missing from/to for custom period.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no agent with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getAgentSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.adminService.getAgentSummary(id, query);
  }

  @Get('agents/:id/transactions')
  @ApiOperation({
    summary: 'Agent transactions',
    description:
      'Admin only. Returns a paginated list of transactions uploaded by a specific agent. ' +
      'Supports filtering by status and date range.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of transactions for the specified agent.',
    type: PaginatedTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no agent with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getAgentTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.adminService.getAgentTransactions(id, query);
  }
}
