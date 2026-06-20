# DB — Kysely over D1

## How it works

DDL lives in `apps/api/migrations/*.sql` (wrangler). Kysely is the typed **query** layer only — it does **not** own DDL. To add a table:

1. Add a numbered SQL migration: `apps/api/migrations/NNNN_<name>.sql`
2. Add the corresponding interface to `DB` in `schema.ts`
3. Apply locally: `pnpm db:migrate`

## Tenant convention

Every product table must have:

```sql
organizationId text not null references organization(id) on delete cascade
```

Never trust a client-supplied org id — always derive it from `session.activeOrganizationId`.

## Timestamps

Every product table must have:

```sql
createdAt text not null,  -- ISO 8601
updatedAt text not null
```

Use `OrgScoped` and `Timestamps` interface fragments in `schema.ts` by spreading them into table interfaces.

## ID generation

Use `generateId()` from `better-auth` (already imported in `auth.ts`), or `crypto.randomUUID()` — both produce unique string ids consistent with better-auth tables.

## Querying

```ts
import { db } from './db/client'

// in a Hono handler:
const orgs = await db(c.env.DB)
  .selectFrom('organization')
  .select(['id', 'name'])
  .execute()

// per-request helper (set in middleware):
const result = await c.var.db
  .selectFrom('member')
  .where('organizationId', '=', c.var.session!.activeOrganizationId!)
  .selectAll()
  .execute()
```

## Scripts

- `pnpm db:migrate` — apply migrations locally
- `pnpm db:migrate:remote` — apply migrations to remote D1
