# bKash Payment Sync Backend — Project Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Current State

**Branch:** `main` (merged 2026-05-12)  
**Build:** passing  
**Commit:** `5adc889`

### What exists now
- NestJS 11 + Fastify
- Drizzle ORM + PostgreSQL
- Redis cache + BullMQ queue
- OTP-based auth (phone + JWT)
- Users module (phone-based, agent/admin roles)
- Transactions module (SMS parse, CRUD, summary)
- Admin module (all txns, agent management)
- Common: guards, pipes, filters, middleware

---

## Phase 1 — Database Schema ✅

### 1.1 `users` table
```
id          uuid PK
name        varchar(100)
phone       varchar(20) UNIQUE
role        enum('admin', 'agent') default 'agent'
is_active   boolean default true
created_at  timestamp
updated_at  timestamp
```

### 1.2 `otp_verifications` table
```
id          uuid PK
phone       varchar(20)
otp         varchar(6)
expires_at  timestamp
is_used     boolean default false
created_at  timestamp
```

### 1.3 `transactions` table
```
id               uuid PK
transaction_id   varchar(50) UNIQUE
amount           numeric(12,2)
transaction_time timestamp
status           enum('received', 'paid') default 'received'
agent_id         uuid FK → users.id
raw_message      text
created_at       timestamp
```

### Migration steps
- [x] Schema written → `src/database/schema/index.ts`
- [ ] `yarn db:generate` — generate migration files
- [ ] `yarn db:migrate` — apply to DB

---

## Phase 2 — Auth Module ✅

OTP flow replaces email/password.

### Endpoints
```
POST /auth/otp/send      @Public()  — sends OTP (logs to console in dev)
POST /auth/otp/verify    @Public()  — verifies OTP, returns JWT tokens
POST /auth/refresh       @Public()  — refresh access token
POST /auth/logout                   — client discards tokens
```

### JWT Payload
```ts
{ sub: userId, phone, role }
```

### Config added
```env
OTP_EXPIRES_MINUTES=5   # in .env and AppConfig
```

> **Note:** SMS provider not integrated. OTP logged to console in dev (`NODE_ENV !== 'production'`). Production SMS wiring is **pending** (Phase 7).

---

## Phase 3 — Transaction Module ✅

`src/transactions/`

### SMS Parser (`src/transactions/utils/sms-parser.util.ts`)
```
Input:  "Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM"
Output: { transactionId, amount, transactionTime }
Fail:   returns null → controller throws 400
```

### Endpoints
```
POST   /transactions/upload            Agent — parse SMS + save (status=received)
GET    /transactions/verify/:txnId     @Public() — verify by TrxID (received only)
PATCH  /transactions/:txnId/status     Agent — mark as paid
GET    /transactions                   Agent — own list (paginated + filterable)
GET    /transactions/summary           Agent — daily/weekly/monthly/custom summary
```

### Summary query
```
?period=daily|weekly|monthly|custom
&from=YYYY-MM-DD   (required if period=custom)
&to=YYYY-MM-DD     (required if period=custom)
```

---

## Phase 4 — Admin Module ✅

`src/admin/` — all endpoints `@Roles('admin')`

### Endpoints
```
GET    /admin/transactions              All txns (filter: agentId, status, from, to)
GET    /admin/transactions/summary      System-wide summary
GET    /admin/agents                    List agents (paginated)
POST   /admin/agents                    Create agent
PATCH  /admin/agents/:id               Update name / isActive
DELETE /admin/agents/:id               Deactivate agent (soft delete)
GET    /admin/agents/:id/summary        Agent-wise summary
GET    /admin/agents/:id/transactions   Agent's transactions
```

---

## Phase 5 — Users Module ✅

Simplified to phone-based profile only.

### Endpoints
```
GET    /users/profile    Own profile
PATCH  /users/profile    Update own name
GET    /users            List all (admin only)
GET    /users/:id        Get by id (admin only)
PATCH  /users/:id        Update (admin only)
```

---

## Phase 6 — Env Vars ✅

```env
OTP_EXPIRES_MINUTES=5
```

Added to `src/config/app.config.ts` and `.env.example`.

---

## Phase 7 — Pending / Next Steps

- [ ] **DB Migrations** — run `yarn db:generate && yarn db:migrate`
- [ ] **SMS Provider** — wire real OTP delivery for production (Twilio / local BD provider)
- [ ] **SMS Parser hardening** — handle more bKash SMS format variations (received money, agent cashout confirmation, etc.)
- [ ] **E2E tests** — cover auth OTP flow, transaction upload, admin endpoints
- [ ] **Unit tests** — `sms-parser.util.ts` edge cases
- [ ] **Rate limiting** — tighten OTP send endpoint (prevent spam)
- [ ] **OTP cleanup job** — BullMQ scheduled job to delete expired OTP records

---

## File Structure (current)

```
src/
  config/
    app.config.ts         OTP_EXPIRES_MINUTES added
  database/
    schema/index.ts       users + otp_verifications + transactions
  auth/
    dto/
      send-otp.dto.ts
      verify-otp.dto.ts
      refresh-token.dto.ts
    auth.service.ts       OTP flow
    auth.controller.ts
    strategies/jwt.strategy.ts
    guards/roles.guard.ts  string-based roles
    decorators/roles.decorator.ts
  users/
    dto/                  phone-based, simplified
    users.service.ts
    users.controller.ts
  transactions/
    utils/sms-parser.util.ts
    dto/
      upload-transaction.dto.ts
      update-status.dto.ts
      transaction-query.dto.ts
      transaction-response.dto.ts
    transactions.service.ts
    transactions.controller.ts
    transactions.module.ts
  admin/
    dto/
      admin-transaction-query.dto.ts
      create-agent.dto.ts
    admin.service.ts
    admin.controller.ts
    admin.module.ts
```

---

## Key Constraints (from CLAUDE.md)

- Drizzle ORM only (no raw SQL, no TypeORM/Prisma)
- `@itgorillaz/configify` for all env vars — no `process.env` in app code
- Fastify only (no Express middleware)
- `JwtAuthGuard` global — `@Public()` to opt out
- `@Roles('admin')` via `RolesGuard` for admin routes
- All DTOs: `class-validator` + `@ApiProperty()`
- Package manager: Yarn only
