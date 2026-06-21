# Milestone 05 — Data layer: Kysely over D1, user-scoped model & migration workflow

**Phase:** 0 · **Depends on:** M03 · **Status:** Done

## Goal
Stand up a type-safe data layer (Kysely query builder over Cloudflare D1) inside `apps/api`, establish
the user-scoped table conventions every later milestone follows, and lock the migration workflow. After
this, new tables are added as a wrangler D1 SQL migration **plus** a Kysely table interface — never as
ad-hoc `db.prepare()` strings.

## Why it matters
The notification platform adds ~25+ tables. Hand-writing SQL and `db.prepare()` strings is untyped and
error-prone. Kysely gives fully-typed queries (autocompletion, compile-time column checking) while staying
a thin layer over D1's native SQL — no ORM runtime, no schema-ownership conflict with better-auth, and
it composes cleanly with the project's existing wrangler D1 migrations.

## Current state
- D1 binding `env.DB` (`apps/api/wrangler.jsonc`), database `renderical`.
- Schema is raw SQL in `apps/api/migrations/0000_auth_schema.sql` (user, account, session, verification),
  applied via `wrangler d1 migrations apply`.
- Auth tables (`user`, `session`, `account`, `verification`, `twoFactor`) are **owned by better-auth**.
- No query builder/ORM today. DB access is `env.DB.prepare(sql).bind(...).run()`.

## Scope (in)
- Add `kysely` + `kysely-d1` (the D1 dialect) to `apps/api`.
- Create `apps/api/src/db/` with: `client.ts` (Kysely instance from `env.DB`) and `schema.ts` (the `DB`
  interface + per-table interfaces).
- **DDL stays in wrangler D1 migrations** (`apps/api/migrations/NNNN_*.sql`) — the repo's native pattern.
  Each new table = a new numbered SQL migration. Kysely is the typed **query** layer only; it does **not**
  own DDL.
- Establish the **user convention**: every product table has `userId text not null references user(id) on
  delete cascade` plus `createdAt`/`updatedAt` (ISO strings). Express it in Kysely with the shared
  `Timestamps` interface fragment.
- Add typed interfaces for the better-auth tables we read (`user`) so product tables can be joined.
- Add npm scripts: `db:migrate` (`wrangler d1 migrations apply DB --local`),
  `db:migrate:remote` (`... --remote`).
- Add an `id()` helper (`crypto.randomUUID()`) so all tables mint ids consistently.

## Out of scope (deferred)
- Any notification tables themselves → defined in their own milestones (M08+).
- Auth middleware → M06.
- Replacing better-auth's table ownership → never; we only add read interfaces for typed joins.

## Data model
No product tables yet — this milestone delivers the typed scaffolding and conventions:

```ts
// apps/api/src/db/schema.ts
export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface UserTable { id: string; name: string; email: string; emailVerified: number; image: string | null }

export interface DB {
  user: UserTable
  // connection, notification, delivery ... added by M08+
}
```

```ts
// apps/api/src/db/client.ts
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { DB } from './schema'
export const db = (d1: D1Database) => new Kysely<DB>({ dialect: new D1Dialect({ database: d1 }) })
export type AppDB = ReturnType<typeof db>
```

## API surface
A temporary `GET /api/_db/health` that counts users through Kysely to prove the wiring.

## Frontend
None.

## Implementation steps
1. `cd apps/api && pnpm add kysely kysely-d1`.
2. Create `apps/api/src/db/schema.ts` and `client.ts`.
3. Wire per-request `db(c.env.DB)` helper into Hono context (`c.var.db`) in `apps/api/src/index.ts`
   and add `GET /api/_db/health`.
4. Add the `db:migrate` / `db:migrate:remote` scripts to `apps/api/package.json`.
5. Run `wrangler d1 migrations apply DB --local` to confirm migrations apply.

## Acceptance criteria
- [x] `pnpm typecheck` passes in `apps/api` with Kysely wired and the `DB` interface in place.
- [x] `GET /api/_db/health` returns a real count from D1 through Kysely.
- [x] `wrangler d1 migrations apply DB --local` succeeds.
- [x] Existing auth flows still work.

## Risks & notes
- **One migration system only.** DDL lives in `apps/api/migrations/*.sql` (wrangler). Do **not** add
  Kysely's programmatic Migrator — it would compete with wrangler over the same D1.
- Keep `schema.ts` in sync with the SQL migrations by hand.
- Every later milestone assumes `db(env.DB)` (typed as `AppDB`) and the "new table = SQL migration +
  `DB` interface entry" workflow.
