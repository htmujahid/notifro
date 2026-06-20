# DB — Kysely over D1

## How it works

DDL lives in `apps/api/migrations/*.sql` (wrangler). Kysely is the typed **query** layer only — it does **not** own DDL. To add a table:

1. Add a numbered SQL migration: `apps/api/migrations/NNNN_<name>.sql`
2. Add the corresponding interface to `DB` in `schema.ts`
3. Apply locally: `pnpm db:migrate`

## Ownership convention

Every product table must have:

```sql
userId text not null references user(id) on delete cascade
```

Never trust a client-supplied user id — always derive it from `c.var.user!.id` (set by `requireAuth`).

## Timestamps

Every product table must have:

```sql
createdAt text not null,  -- ISO 8601
updatedAt text not null
```

Use the `Timestamps` interface fragment in `schema.ts` by spreading it into table interfaces, and give each product table a `userId: string` field.

## ID generation

Use `generateId()` from `better-auth` (already imported in `auth.ts`), or `crypto.randomUUID()` — both produce unique string ids consistent with better-auth tables.

## Querying

```ts
import { db } from './db/client'

// in a Hono handler:
const users = await db(c.env.DB)
  .selectFrom('user')
  .select(['id', 'name'])
  .execute()

// per-request helper (set in middleware):
const result = await c.var.db
  .selectFrom('connection')
  .where('userId', '=', c.var.user!.id)
  .selectAll()
  .execute()
```

## Scripts

- `pnpm db:migrate` — apply migrations locally
- `pnpm db:migrate:remote` — apply migrations to remote D1
