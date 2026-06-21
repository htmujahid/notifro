# Milestone 08 — Channel registry & connection storage

**Phase:** 1 · **Depends on:** M05, M06 · **Status:** Done

## Goal
Introduce the core channel abstraction: a fixed set of channel **types**, a user-scoped `connection`
table that stores a user's configured providers (credentials/config, status, scopes, health), and a
`ChannelAdapter` TypeScript interface plus a registry mapping each type to its adapter. No adapter is
implemented yet — this defines the contract every channel milestone (M10+) plugs into.

## Why it matters
Every delivery feature hangs off "which channel, configured how, with what credentials." Defining the
connection storage and the adapter contract once means adding SMS, WhatsApp, Telegram, etc. later is just
implementing one interface and registering it — not reworking the data model each time.

## Current state
- The mock Channels page (`packages/views/src/pages/channels.tsx`) hardcodes a `CHANNELS` array with
  `connected` booleans and local `useState` toggles — no persistence.
- `@workspace/mailer` already sends email via the Cloudflare `EMAIL` binding (the email channel's transport).
- M05 provides the typed Kysely client; M06 provides `requireAuth`, the error envelope, and route-module pattern.

## Scope (in)
- **Channel types** (`apps/api/src/channels/types.ts`): a `ChannelType` union —
  `email | webhook | web_push | sms | whatsapp | telegram | in_app` (M08's initial 7-type scope;
  later extended to 11 by M18–M20 — `+ slack, discord, teams, mobile_push` — so the final union is 11).
- **`connection` table** (wrangler SQL migration + Kysely `DB` interface): user-scoped row representing one
  configured provider instance — `id`, `userId`, `type` (`ChannelType`), `name` (human label),
  `status` (`active | disabled | needs_reauth | error`), `config` (JSON text — non-secret settings),
  `credentials` (JSON text — **encrypted at rest**), `scopes` (JSON text array),
  `health` (JSON: `{ lastCheckedAt, ok, message? }`), `createdAt`/`updatedAt`.
  Index on `(userId, type)` and `(userId, createdAt, id)`.
- **`ChannelAdapter` interface** (`apps/api/src/channels/adapter.ts`):
  ```ts
  interface ChannelAdapter<Config = unknown, Provider = unknown> {
    type: ChannelType
    validateConfig(input: unknown): Config
    transform(payload: ComposePayload, ctx): Provider
    send(provider: Provider, conn: Connection): Promise<SendResult>
    parseReceipt?(raw: unknown): ReceiptUpdate
    healthCheck?(conn: Connection): Promise<HealthResult>
  }
  ```
- **Registry** (`apps/api/src/channels/registry.ts`): `registerAdapter()` / `getAdapter(type)` map.
- **Connections CRUD route module** (`apps/api/src/routes/connections.ts`): list/create/update/delete
  connections for the authenticated user (`requireAuth`). On create/update, call the adapter's
  `validateConfig` if registered; otherwise store as-is and mark `status: 'disabled'`.
- A small **encryption helper** (`apps/api/src/lib/crypto.ts`) to encrypt/decrypt the `credentials` blob
  using a worker secret (`CONNECTION_ENC_KEY`).

## Out of scope (deferred)
- Any concrete adapter implementation → M10 (email) and M13–M17.
- The `ComposePayload` definition → M09.
- Inbound receipt handling → M22.

## Data model
`connection` (new). Wrangler D1 migration (`apps/api/migrations/0002_connections.sql`):
```sql
CREATE TABLE "connection" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "type" text not null,
  "name" text not null,
  "status" text not null default 'active',
  "config" text not null default '{}',
  "credentials" text,
  "scopes" text not null default '[]',
  "health" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "connection_user_type_idx" ON "connection" ("userId", "type");
CREATE INDEX "connection_user_createdAt_idx" ON "connection" ("userId", "createdAt", "id");
```

Kysely interface:
```ts
export interface ConnectionTable {
  id: string
  userId: string
  type: string
  name: string
  status: string
  config: string
  credentials: string | null
  scopes: string
  health: string | null
  createdAt: string
  updatedAt: string
}
```

## API surface
- `GET    /api/connections` — list the authenticated user's connections. Secrets redacted.
- `POST   /api/connections` — create; validates via adapter if registered.
- `PATCH  /api/connections/:id` — update name/config/status.
- `DELETE /api/connections/:id` — remove.
- `POST   /api/connections/:id/health` — run `healthCheck` if adapter supports it.

**List query (M06 contract)**:
- Pagination: offset/`page` acceptable; cursor supported.
- Default sort: `createdAt desc` (tiebreaker `id`).
- Sortable: `createdAt`, `name`, `channelType` (→ `type`), `status`.
- Filterable: `channelType` (`eq`/`in`), `status` (`eq`).
- All filters AND-ed with mandatory `userId` scope.

## Frontend
- `packages/core/src/hooks/connections.ts` — `connectionKeys` factory + typed hooks.
- Channels page wired in M10 once email actually sends.

## Implementation steps
1. Define `ChannelType` and the `ChannelAdapter`/`SendResult`/`ReceiptUpdate`/`HealthResult` types.
2. Add the `connection` table: write migration `0002_connections.sql` and add `ConnectionTable` to `DB`.
3. Implement `apps/api/src/lib/crypto.ts` (AES-GCM via WebCrypto); add `CONNECTION_ENC_KEY` to
   `.dev.vars.example` and `worker-configuration.d.ts`.
4. Implement the registry (`registry.ts`).
5. Build `apps/api/src/routes/connections.ts`; encrypt credentials on write, redact on read.
6. Mount in `apps/api/src/index.ts`.
7. Apply migration locally with `wrangler d1 migrations apply DB --local`.
8. Add `packages/core/src/hooks/connections.ts`.

## Acceptance criteria
- [x] `connection` table exists locally (migration applied) and is user-scoped (`userId` FK).
- [x] CRUD endpoints work; credentials are never returned in responses.
- [x] `credentials` is stored encrypted.
- [x] `getAdapter(type)` returns `undefined` for all types without crashing the CRUD flow.
- [x] `GET /api/connections` returns `{ data, nextCursor }`, honors `channelType`/`status` filters,
      and `422`s an unknown sort/filter key.
- [x] `pnpm typecheck` passes.

## Risks & notes
- **Credential encryption is mandatory** — never store provider tokens/secrets in plaintext D1.
- `in_app` and `web_push` connections may be singletons with little/no credentials; the schema tolerates
  `credentials: null`.
