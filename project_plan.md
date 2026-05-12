# bKash Payment Sync Backend — Project Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Current State (Boilerplate)

Already exists:
- NestJS 11 + Fastify setup
- Drizzle ORM + PostgreSQL connection
- Redis cache + BullMQ queue
- JWT auth (email/password) — **needs replacement**
- Users CRUD module
- Common: guards, pipes, filters, middleware, pagination

---

## Phase 1 — Database Schema

### 1.1 Modify `users` table
- [ ] Add `phone` (unique, not null)
- [ ] Add `role` enum: `admin | agent`
- [ ] Remove `email` / `password` fields (replaced by OTP auth)
- [ ] Keep: `id`, `name`, `created_at`

### 1.2 New: `otp_verifications` table
```
id            uuid PK
phone         varchar
otp           varchar(6)
expires_at    timestamp
is_used       boolean default false
created_at    timestamp
```

### 1.3 New: `transactions` table
```
id               uuid PK
transaction_id   varchar UNIQUE   -- bKash TrxID
amount           numeric(12,2)
transaction_time timestamp        -- time from SMS/bKash
status           enum('received', 'paid')
agent_id         uuid FK → users.id
raw_message      text             -- original SMS text
created_at       timestamp
```

### Migration steps
- [ ] Update `src/database/schema/index.ts`
- [ ] `yarn db:generate`
- [ ] `yarn db:migrate`

---

## Phase 2 — Auth Module (OTP-based)

Replace current email/password auth with phone + OTP flow.

### 2.1 DTOs
- [ ] `SendOtpDto` — `{ phone: string }`
- [ ] `VerifyOtpDto` — `{ phone: string, otp: string }`

### 2.2 Service methods
- [ ] `sendOtp(phone)` — generate 6-digit OTP, store in `otp_verifications`, return OTP (dev) / send SMS (prod)
- [ ] `verifyOtp(phone, otp)` — validate OTP + expiry, mark `is_used=true`, find/create user, issue JWT

### 2.3 Endpoints
```
POST /auth/otp/send      @Public()  — send OTP to phone
POST /auth/otp/verify    @Public()  — verify OTP, return access + refresh tokens
POST /auth/refresh        @Public()  — refresh access token
```

### 2.4 JWT Payload update
```ts
{ sub: userId, phone, role }   // replace email with phone
```

### 2.5 Config
- [ ] Add `OTP_EXPIRES_MINUTES` env var (default: 5)
- [ ] Add SMS provider config (optional in v1, log OTP to console in dev)

---

## Phase 3 — Transaction Module

`src/transactions/`

### 3.1 DTOs
- [ ] `UploadTransactionDto` — `{ raw_message: string }` only — server parses all fields
- [ ] `VerifyTransactionDto` — `{ transaction_id }`
- [ ] `UpdateTransactionStatusDto` — `{ transaction_id, status: 'paid' }`
- [ ] `TransactionQueryDto` — pagination + date range + status filter

### 3.1.1 SMS Parser (`src/transactions/utils/sms-parser.util.ts`)

bKash Cashout SMS format:
```
Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM
```

Parsed fields:
| Field | Pattern |
|---|---|
| `transaction_id` | `TrxID ([A-Z0-9]+)` |
| `amount` | `Tk ([\d,]+\.\d{2})` (first match = cashout amount) |
| `transaction_time` | `(\d{2}/\d{2}/\d{2} \d{1,2}:\d{2} [AP]M)` |
| `sender_phone` | `from (01\d{9})` (stored in raw, not a DB column) |

Parser returns `ParsedSmsResult | null`. If null → 422 with `"Could not parse SMS message"`.

### 3.2 Service methods
| Method | Description |
|---|---|
| `uploadTransaction(agentId, dto)` | Parse `raw_message` → extract fields → save with `status=received` |
| `verifyTransaction(transactionId)` | Search `status=received` txns, return match |
| `updateStatus(transactionId, 'paid')` | Agent marks txn as paid |
| `getAgentTransactions(agentId, query)` | Paginated list for agent |
| `getAgentSummary(agentId, range)` | Daily/weekly/monthly/custom summary |

### 3.3 Endpoints
```
POST   /transactions/upload            Agent — upload new transaction
GET    /transactions/verify/:txnId     @Public() or Agent — verify by TrxID
PATCH  /transactions/:txnId/status     Agent — mark paid
GET    /transactions                   Agent — own transaction list
GET    /transactions/summary           Agent — summary report
```

### 3.4 Summary query params
```
?period=daily|weekly|monthly|custom
&from=YYYY-MM-DD   (required if period=custom)
&to=YYYY-MM-DD     (required if period=custom)
```

### 3.5 Summary response shape
```json
{
  "total_paid_amount": 45000.00,
  "total_transaction_count": 23,
  "period": "weekly",
  "from": "2026-05-05",
  "to": "2026-05-12"
}
```

---

## Phase 4 — Admin Module

`src/admin/`

### 4.1 All endpoints guarded by `@Roles('admin')`

### 4.2 Endpoints
```
GET    /admin/transactions              All agents' transactions (paginated + filterable)
GET    /admin/transactions/summary      System-wide summary
GET    /admin/agents                    List all agents
POST   /admin/agents                    Create agent
PATCH  /admin/agents/:id               Update agent
DELETE /admin/agents/:id               Deactivate agent
GET    /admin/agents/:id/summary        Agent-wise summary
GET    /admin/agents/:id/transactions   Specific agent's transactions
```

### 4.3 Admin query filters
- `agent_id` — filter by agent
- `status` — received | paid
- `from` / `to` — date range
- `page` / `limit` — pagination

---

## Phase 5 — Users Module Update

Current users module handles email/password. Update:
- [ ] Remove password-related endpoints
- [ ] Add phone as primary identifier
- [ ] Keep profile view + update (name only)
- [ ] Admin can manage agents via admin module

---

## Phase 6 — Environment Variables (additions)

```env
# OTP
OTP_EXPIRES_MINUTES=5

# SMS Provider (optional v1)
SMS_PROVIDER_URL=
SMS_PROVIDER_API_KEY=
```

---

## File Structure (to be created)

```
src/
  auth/
    dto/
      send-otp.dto.ts           NEW
      verify-otp.dto.ts         NEW
    auth.service.ts             MODIFY (replace email/pass with OTP)
    auth.controller.ts          MODIFY

  transactions/
    utils/
      sms-parser.util.ts        NEW — regex parser for bKash SMS
    dto/
      upload-transaction.dto.ts
      verify-transaction.dto.ts
      update-status.dto.ts
      transaction-query.dto.ts
      transaction-response.dto.ts
      summary-response.dto.ts
    transactions.module.ts
    transactions.service.ts
    transactions.controller.ts

  admin/
    dto/
      admin-query.dto.ts
      create-agent.dto.ts
    admin.module.ts
    admin.service.ts
    admin.controller.ts

  database/schema/
    index.ts                    MODIFY (add otp_verifications, transactions)
```

---

## Implementation Order

1. [ ] Phase 1 — Schema + migrations
2. [ ] Phase 2 — OTP auth
3. [ ] Phase 3 — Transaction module
4. [ ] Phase 4 — Admin module
5. [ ] Phase 5 — Users module cleanup
6. [ ] Phase 6 — Env vars + SMS integration

---

## Key Constraints (from CLAUDE.md)

- Drizzle ORM only (no raw SQL)
- `@itgorillaz/configify` for all env vars
- Fastify only (no Express middleware)
- `JwtAuthGuard` global — use `@Public()` for open endpoints
- `@Roles('admin')` via `RolesGuard` for admin routes
- All DTOs need `class-validator` + `@ApiProperty()`
