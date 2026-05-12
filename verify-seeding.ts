import { createDatabaseConnection } from './src/database/connection';
import { users } from './src/database/schema';
import { count } from 'drizzle-orm';
import { DatabaseConfig } from './src/config/database.config';

async function verifySeeding() {
  try {
    console.log('🔍 Verifying database seeding...');

    const databaseConfig = new DatabaseConfig();
    const db = createDatabaseConnection(databaseConfig);

    const totalResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalResult[0].count;
    console.log(`📊 Total users in database: ${totalUsers}`);

    const sampleUsers = await db
      .select({ id: users.id, name: users.name, phone: users.phone, role: users.role, createdAt: users.createdAt })
      .from(users)
      .limit(5);

    console.log('\n👥 Sample users:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.phone}) - Role: ${user.role}`);
    });

    if (totalUsers > 0) {
      console.log('\n🎉 Verification completed successfully!');
    } else {
      console.log('\n❌ No users found. Seeding may have failed.');
    }
  } catch (error) {
    console.error('❌ Error verifying seeding:', error);
    process.exit(1);
  }
}

verifySeeding();
