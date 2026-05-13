import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, gte, lte, count, sum, desc, ilike, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { transactions, users } from '../database/schema';
import { parseBkashSms } from './utils/sms-parser.util';
import {
  UploadTransactionDto,
  UpdateStatusDto,
  TransactionQueryDto,
  SummaryQueryDto,
  SummaryPeriod,
  TransactionResponseDto,
  SummaryResponseDto,
  PaginatedTransactionResponseDto,
} from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class TransactionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async upload(
    agentId: string,
    agentPhone: string,
    dto: UploadTransactionDto,
  ): Promise<TransactionResponseDto> {
    const parsed = parseBkashSms(dto.rawMessage);
    if (!parsed) {
      throw new BadRequestException('Could not parse SMS message');
    }

    const db = this.databaseService.getDatabase();

    const [existing] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.transactionId, parsed.transactionId));

    if (existing) {
      throw new ConflictException('Transaction already exists');
    }

    const [tx] = await db
      .insert(transactions)
      .values({
        transactionId: parsed.transactionId,
        amount: parsed.amount.toFixed(2),
        transactionTime: parsed.transactionTime,
        status: 'received',
        agentId,
        senderPhone: parsed.senderPhone,
        receiverPhone: agentPhone,
        rawMessage: dto.rawMessage,
      })
      .returning();

    return this.toDto(tx);
  }

  async verify(transactionId: string): Promise<TransactionResponseDto> {
    const db = this.databaseService.getDatabase();

    const [tx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionId, transactionId),
          eq(transactions.status, 'received'),
        ),
      );

    if (!tx)
      throw new NotFoundException(
        'Transaction not found or not in received status',
      );
    return this.toDto(tx);
  }

  async updateStatus(
    transactionId: string,
    dto: UpdateStatusDto,
  ): Promise<TransactionResponseDto> {
    const db = this.databaseService.getDatabase();

    const [tx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionId, transactionId)
        ),
      );

    if (!tx) throw new NotFoundException('Transaction not found');

    const [updated] = await db
      .update(transactions)
      .set({ status: dto.status as any })
      .where(eq(transactions.id, tx.id))
      .returning();

    return this.toDto(updated);
  }

  async findByAgent(
    agentId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    const db = this.databaseService.getDatabase();
    const { page = 1, limit = 10, status, from, to } = query;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(transactions.agentId, agentId)];
    if (status) conditions.push(eq(transactions.status, status as any));
    if (from) conditions.push(gte(transactions.transactionTime, from));
    if (to) conditions.push(lte(transactions.transactionTime, to));

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(transactions)
      .where(where);

    const rows = await db
      .select({ tx: transactions, agentName: users.name })
      .from(transactions)
      .leftJoin(users, eq(transactions.agentId, users.id))
      .where(where)
      .orderBy(desc(transactions.transactionTime))
      .limit(limit)
      .offset(offset);

    return new PaginatedTransactionResponseDto(
      rows.map((r) => this.toDto({ ...r.tx, agentName: r.agentName ?? null })),
      Number(total),
      page,
      limit,
    );
  }

  async getSummary(
    agentId: string | null,
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    const db = this.databaseService.getDatabase();
    const { period = SummaryPeriod.MONTHLY, from, to } = query;

    const { fromDate, toDate } = this.resolveDateRange(period, from, to);

    const conditions: any[] = [eq(transactions.status, 'paid')];
    if (agentId) conditions.push(eq(transactions.agentId, agentId));
    conditions.push(gte(transactions.transactionTime, fromDate));
    conditions.push(lte(transactions.transactionTime, toDate));

    const [result] = await db
      .select({
        total: count(),
        totalAmount: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions));

    return {
      totalPaidAmount: Number(result.totalAmount ?? 0),
      totalTransactionCount: Number(result.total),
      period,
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
    };
  }

  async findAll(
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    const db = this.databaseService.getDatabase();
    const { page = 1, limit = 10, status, from, to } = query;
    const search = (query as any).search as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (status) conditions.push(eq(transactions.status, status as any));
    if (from) conditions.push(gte(transactions.transactionTime, from));
    if (to) conditions.push(lte(transactions.transactionTime, to));
    if (search) {
      conditions.push(
        or(
          ilike(transactions.transactionId, `%${search}%`),
          ilike(transactions.senderPhone, `%${search}%`),
          ilike(transactions.receiverPhone, `%${search}%`),
          ilike(users.name, `%${search}%`),
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(transactions)
      .leftJoin(users, eq(transactions.agentId, users.id))
      .where(where);

    const rows = await db
      .select({ tx: transactions, agentName: users.name })
      .from(transactions)
      .leftJoin(users, eq(transactions.agentId, users.id))
      .where(where)
      .orderBy(desc(transactions.transactionTime))
      .limit(limit)
      .offset(offset);

    return new PaginatedTransactionResponseDto(
      rows.map((r) => this.toDto({ ...r.tx, agentName: r.agentName ?? null })),
      Number(total),
      page,
      limit,
    );
  }

  private resolveDateRange(
    period: SummaryPeriod,
    from?: Date,
    to?: Date,
  ): { fromDate: Date; toDate: Date } {
    const now = new Date();
    let fromDate: Date;
    const toDate: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    if (period === SummaryPeriod.CUSTOM) {
      if (!from || !to) {
        throw new BadRequestException(
          'from and to are required for custom period',
        );
      }
      return { fromDate: from, toDate: to };
    }

    if (period === SummaryPeriod.DAILY) {
      fromDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
    } else if (period === SummaryPeriod.WEEKLY) {
      const day = now.getDay();
      fromDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day,
        0,
        0,
        0,
      );
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    return { fromDate, toDate };
  }

  private toDto(tx: any): TransactionResponseDto {
    return plainToClass(TransactionResponseDto, tx, {
      excludeExtraneousValues: true,
    });
  }
}
