# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev
yarn start:dev          # watch mode
yarn start:debug        # debug + watch

# Build & Prod
yarn build
yarn start:prod         # run dist/main

# Test
yarn test               # unit tests (src/**/*.spec.ts)
yarn test:watch
yarn test:cov
yarn test:e2e           # jest --config ./test/jest-e2e.json
yarn test:debug         # single test with inspector

# Lint / Format
yarn lint               # eslint --fix
yarn format             # prettier --write

# Database
yarn db:generate        # drizzle-kit generate (after schema change)
yarn db:migrate         # run pending migrations
yarn db:fresh           # drop + recreate + migrate
yarn db:fresh:force     # same, skip confirmation
yarn db:reset           # alias for fresh reset
yarn db:studio          # Drizzle Studio UI
yarn db:check           # validate migration consistency

# Seeding
yarn seed:users         # ts-node src/seeders/user.seeder.ts
```

**Package manager: Yarn only. Never use npm.**

## Architecture

NestJS 11 on Fastify (not Express). Three mandatory constraints apply everywhere:

| Concern | Required | Forbidden |
|---|---|---|
| ORM | Drizzle ORM | TypeORM, Prisma, Sequelize, raw SQL |
| Config | `@itgorillaz/configify` | `@nestjs/config`, `process.env` direct access |
| HTTP | Fastify / `@fastify` plugins | Express, Koa, Hapi, any Express middleware |

## Module Structure

```
src/
  config/          # @Configuration() classes — one per domain
  database/
    schema/        # Drizzle table definitions (index.ts exports all)
    connection.ts  # createDatabaseConnection()
    database.module.ts   # Global module, provides DATABASE_CONNECTION token
    database.service.ts  # DatabaseService wraps db for injection
  common/
    middleware/    # SecurityHeadersMiddleware, SanitizationMiddleware (applied globally)
    pipes/         # CustomValidationPipe (global)
    filters/       # GlobalExceptionFilter (global)
    utils/         # pagination.util, filter.util
  auth/
    guards/        # JwtAuthGuard (default global), RolesGuard, ApiKeyGuard, RateLimitGuard
    decorators/    # @Public(), @Roles(), @CurrentUser(), @RateLimit()
    strategies/    # JWT passport strategy
  users/           # CRUD module — service, controller, DTOs
  bull-board/      # BullMQ dashboard at /queues
```

## Key Patterns

**Config classes** use `@Configuration()` + `@Value('ENV_VAR')` decorators. All configs are injected via `ConfigifyModule.forRootAsync()` — never read `process.env` directly in application code.

**Database access**: Inject `DatabaseService` for common ops. For complex queries, call `databaseService.getDatabase()` to get the raw Drizzle `db` instance and use the query builder. Schema types come from `typeof users.$inferSelect` / `$inferInsert`.

**Auth flow**: `JwtAuthGuard` is applied globally in `AuthModule`. Mark public routes with `@Public()` decorator. JWT payload shape is `JwtPayload` (sub=userId, email, username, role). Both access token and refresh token are issued on login/register.

**Cache**: `CacheModule` (global) uses Redis as primary store with in-memory LRU fallback. Cache namespace is `app-cache`. Falls back to memory-only if Redis is unreachable on startup.

**Queue**: BullMQ connects to Redis via `BullMQRedisConfig`. Bull Board UI available at `/queues` (dev only).

## Adding a New Module

1. Schema changes → `src/database/schema/index.ts` → `yarn db:generate` → `yarn db:migrate`
2. New config env vars → add `@Configuration()` class in `src/config/`
3. Service injects `DatabaseService` or `@Inject('DATABASE_CONNECTION')` for raw db
4. All DTOs use `class-validator` decorators + `@ApiProperty()` for Swagger
5. Routes are JWT-protected by default; use `@Public()` to opt out

## API Documentation Standards

Every endpoint and DTO **must** follow these rules. No exceptions.

### Controller — `@ApiOperation`

```ts
@ApiOperation({
  summary: 'Short action label (≤60 chars)',
  description: 'Full sentence explaining what the endpoint does, who can call it, and any side effects or constraints.',
})
```

### Controller — `@ApiResponse` per endpoint

Always declare **all** applicable status codes. Use typed schemas — never bare descriptions.

| Status | When | Schema type |
|--------|------|-------------|
| 200/201 | Success | The response DTO class |
| 400 | Validation failure | `ValidationErrorResponseDto` |
| 401 | Missing/invalid JWT | `ErrorResponseDto` |
| 403 | Insufficient role | `ErrorResponseDto` (admin-only routes) |
| 404 | Resource not found | `ErrorResponseDto` (routes with `:id` param) |
| 409 | Duplicate/conflict | `ErrorResponseDto` (create routes) |
| 429 | Rate limited | `ErrorResponseDto` (auth routes) |
| 500 | Server error | `ErrorResponseDto` |

Import shared error DTOs from `'../common'`:

```ts
import { ErrorResponseDto, ValidationErrorResponseDto } from '../common';
```

Add `description` to every `@ApiResponse`:

```ts
@ApiResponse({ status: 201, description: 'Resource created and returned.', type: MyResponseDto })
@ApiResponse({ status: 400, description: 'Validation error — invalid request body.', type: ValidationErrorResponseDto })
@ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
@ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
```

### Controller — `@ApiParam` for path parameters

```ts
@ApiParam({ name: 'id', description: 'User UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
```

### Request DTOs (`@ApiProperty` / `@ApiPropertyOptional`)

Every field must have:
- `description` — plain-English explanation of the field's meaning
- `example` — a realistic value
- `minLength` / `maxLength` for strings with length constraints
- `pattern` for regex-validated strings (escape backslashes: `'^01[3-9]\\d{8}$'`)
- `format` for typed strings (`'uuid'`, `'date-time'`, `'jwt'`)
- `minimum` / `maximum` for numeric range constraints
- `enum` + `enumName` for enum fields; describe each enum value in `description`

```ts
// String with constraints
@ApiProperty({
  description: 'Full name of the agent',
  example: 'John Doe',
  minLength: 2,
  maxLength: 100,
})

// Phone number
@ApiProperty({
  description: 'Contact phone number (Bangladeshi format)',
  example: '01711223344',
  pattern: '^01[3-9]\\d{8}$',
  minLength: 11,
  maxLength: 11,
})

// Enum
@ApiProperty({
  description: '`admin`: full system access. `agent`: own transactions only.',
  enum: ['admin', 'agent'],
  enumName: 'UserRole',
  example: 'agent',
})

// Date-time
@ApiProperty({
  description: 'Timestamp when the record was created',
  format: 'date-time',
  example: '2026-01-15T08:00:00.000Z',
})

// UUID
@ApiProperty({
  description: 'Unique identifier',
  format: 'uuid',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
```

### Response DTOs

Apply the same `@ApiProperty` rules as request DTOs. Additionally:
- Add `format: 'uuid'` to UUID fields
- Add `format: 'date-time'` + realistic `example` to all `Date` fields
- Add `nullable: true` to fields that can be null
- Mirror `minLength`, `maxLength`, `pattern` from the corresponding request DTO

### Shared error DTO rule

`ErrorResponseDto` and `ValidationErrorResponseDto` (in `src/common/dto/error-response.dto.ts`) must **not** contain hardcoded `statusCode` or `message` examples, because the same class is reused across 400/401/403/500 responses. The field `description` is sufficient; per-response context is conveyed by `@ApiResponse({ description: '...' })`.

## Environment Variables

Copy `.env.example` to `.env`. Required groups: `APP` (PORT, NODE_ENV, API_PREFIX), `DB_*` (PostgreSQL), `REDIS_*` + `CACHE_TTL`, `JWT_*` + `BCRYPT_ROUNDS`, `RATE_LIMIT_*`.

Swagger UI available at path configured by `SWAGGER_*` vars (enabled by default in dev).