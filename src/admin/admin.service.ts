import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, count, sum, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { transactions, users } from '../database/schema';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { SummaryQueryDto, SummaryPeriod } from '../transactions/dto';
import {
  UserResponseDto,
  PaginatedUserResponseDto,
  QueryUserDto,
} from '../users/dto';
import {
  PaginatedTransactionResponseDto,
  SummaryResponseDto,
  TransactionResponseDto,
} from '../transactions/dto';
import { plainToClass } from 'class-transformer';
import { TopAgentResponseDto } from './dto/top-agent-response.dto';

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

  async getAgentSummary(
    agentId: string,
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.transactionsService.getSummary(agentId, query);
  }

  async getAgentTransactions(
    agentId: string,
    query: AdminTransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.transactionsService.findByAgent(agentId, query as any);
  }

  async getAgent(id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  async listAgents(query: QueryUserDto): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAll({ ...query, role: 'agent' as any });
  }

  async createAgent(dto: CreateAgentDto): Promise<UserResponseDto> {
    return this.usersService.create({ ...dto, role: 'agent' as any });
  }

  async updateAgent(
    id: string,
    dto: { name?: string; isActive?: boolean },
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  async deactivateAgent(id: string): Promise<UserResponseDto> {
    return this.usersService.softDelete(id);
  }

  async getTopAgents(limit = 5): Promise<TopAgentResponseDto[]> {
    const db = this.databaseService.getDatabase();

    const rows = await db
      .select({
        agentId: users.id,
        name: users.name,
        phone: users.phone,
        totalPaid: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        txCount: sql<number>`COUNT(${transactions.id})`,
      })
      .from(users)
      .leftJoin(
        transactions,
        and(
          eq(transactions.agentId, users.id),
          eq(transactions.status, 'paid'),
        ),
      )
      .where(eq(users.role, 'agent'))
      .groupBy(users.id)
      .orderBy(desc(sql`COALESCE(SUM(${transactions.amount}), 0)`))
      .limit(limit);

    return rows.map((r) => ({
      agentId: r.agentId,
      name: r.name,
      phone: r.phone,
      totalPaid: parseFloat(r.totalPaid),
      txCount: Number(r.txCount),
    }));
  }
}
