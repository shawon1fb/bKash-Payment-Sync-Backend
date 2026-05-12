import { Injectable, Inject } from '@nestjs/common';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: ReturnType<typeof drizzle>,
  ) {}

  getDatabase() {
    return this.db;
  }

  async getUserById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: string, userData: Partial<typeof users.$inferInsert>) {
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async healthCheck() {
    try {
      await this.db.select().from(users).limit(1);
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}
