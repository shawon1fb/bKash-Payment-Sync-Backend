import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();
import {
  createDatabaseConnection,
  closeDatabaseConnection,
} from '../database/connection';
import { users } from '../database/schema';

class SimpleDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;

  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = parseInt(process.env.DB_PORT || '5432');
    this.database = process.env.DB_NAME || 'task_db';
    this.username = process.env.DB_USER || 'task_user';
    this.password = process.env.DB_PASSWORD || 'task_password_2024';
    this.ssl = process.env.DB_SSL === 'true';
  }

  getDatabaseUrl(): string {
    const sslParam = this.ssl ? '?sslmode=require' : '';
    return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}${sslParam}`;
  }
}

const SEED_AGENTS = [
  { name: 'Admin User', phone: '01700000001', role: 'admin' as const },
  { name: 'Agent One', phone: '01711000001', role: 'agent' as const },
  { name: 'Agent Two', phone: '01711000002', role: 'agent' as const },
  { name: 'Agent Three', phone: '01711000003', role: 'agent' as const },
];

export class UserSeeder {
  private db: ReturnType<typeof createDatabaseConnection>;

  constructor() {
    this.db = createDatabaseConnection(new SimpleDatabaseConfig());
  }

  async run(): Promise<void> {
    try {
      console.log('🌱 Seeding users...');

      for (const seed of SEED_AGENTS) {
        const [existing] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, seed.phone));

        if (existing) {
          console.log(`⏭️  Skipped (exists): ${seed.phone}`);
          continue;
        }

        await this.db.insert(users).values(seed);
        console.log(`✅ Created: ${seed.name} (${seed.phone}) - ${seed.role}`);
      }

      console.log('🎉 Seeding completed!');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await closeDatabaseConnection();
    }
  }
}

if (require.main === module) {
  const seeder = new UserSeeder();
  seeder
    .run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
