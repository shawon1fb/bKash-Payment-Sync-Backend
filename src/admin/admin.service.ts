import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, count, sum, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { transactions } from '../database/schema';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { SummaryQueryDto, SummaryPeriod } from '../transactions/dto';
import { UserResponseDto, PaginatedUserResponseDto, QueryUserDto } from '../users/dto';
import {
  PaginatedTransactionResponseDto,
  SummaryResponseDto,
  TransactionResponseDto,
} from '../transactions/dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class AdminService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  async getAllTransactions(
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    const { agentId, ...rest } = query;
    if (agentId) {
      return this.transactionsService.findByAgent(agentId, rest as any);
    }
    return this.transactionsService.findAll(rest as any);
  }

  async getSystemSummary(query: SummaryQueryDto): Promise<SummaryResponseDto> {
    return this.transactionsService.getSummary(null, query);
  }

  async getAgentSummary(agentId: string, query: SummaryQueryDto): Promise<SummaryResponseDto> {
    return this.transactionsService.getSummary(agentId, query);
  }

  async getAgentTransactions(
    agentId: string,
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.transactionsService.findByAgent(agentId, query as any);
  }

  async listAgents(query: QueryUserDto): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAll({ ...query, role: 'agent' as any });
  }

  async createAgent(dto: CreateAgentDto): Promise<UserResponseDto> {
    return this.usersService.create({ ...dto, role: 'agent' as any });
  }

  async updateAgent(id: string, dto: { name?: string; isActive?: boolean }): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  async deactivateAgent(id: string): Promise<UserResponseDto> {
    return this.usersService.softDelete(id);
  }
}
