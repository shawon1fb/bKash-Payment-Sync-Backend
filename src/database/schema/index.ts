import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent']);
export const transactionStatusEnum = pgEnum('transaction_status', [
  'received',
  'paid',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  role: userRoleEnum('role').notNull().default('agent'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull(),
  otp: varchar('otp', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: varchar('transaction_id', { length: 50 }).notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  transactionTime: timestamp('transaction_time').notNull(),
  status: transactionStatusEnum('status').notNull().default('received'),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => users.id),
  rawMessage: text('raw_message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const schema = {
  users,
  otpVerifications,
  transactions,
};

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
