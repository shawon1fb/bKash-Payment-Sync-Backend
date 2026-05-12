import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, or, ilike, and, count, asc, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
  UserSortField,
  SortOrder,
} from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const db = this.databaseService.getDatabase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, dto.phone));

    if (existing) {
      throw new ConflictException('User with this phone already exists');
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: dto.name,
        phone: dto.phone,
        role: (dto.role as any) ?? 'agent',
      })
      .returning();

    return this.toDto(newUser);
  }

  async findAll(queryDto: QueryUserDto): Promise<PaginatedUserResponseDto> {
    const db = this.databaseService.getDatabase();
    const { page = 1, limit = 10, search, role, isActive, sortBy, sortOrder } = queryDto;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`)),
      );
    }
    if (role) conditions.push(eq(users.role, role as any));
    if (isActive !== undefined) conditions.push(eq(users.isActive, isActive));

    const where = conditions.length ? and(...conditions) : undefined;

    const orderCol =
      sortBy === UserSortField.NAME ? users.name : users.createdAt;
    const order = sortOrder === SortOrder.ASC ? asc(orderCol) : desc(orderCol);

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(where);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    return new PaginatedUserResponseDto(rows.map(this.toDto), Number(total), page, limit);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return this.toDto(await this.findById(id));
  }

  async findByPhone(phone: string): Promise<UserResponseDto | null> {
    const db = this.databaseService.getDatabase();
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user ? this.toDto(user) : null;
  }

  async findByPhoneRaw(phone: string) {
    const db = this.databaseService.getDatabase();
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user ?? null;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const db = this.databaseService.getDatabase();
    await this.findById(id);

    const [updated] = await db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return this.toDto(updated);
  }

  async softDelete(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: false });
  }

  async remove(id: string): Promise<{ message: string }> {
    const db = this.databaseService.getDatabase();
    await this.findById(id);
    await db.delete(users).where(eq(users.id, id));
    return { message: 'User deleted successfully' };
  }

  private async findById(id: string) {
    const db = this.databaseService.getDatabase();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private toDto(user: any): UserResponseDto {
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true });
  }
}
