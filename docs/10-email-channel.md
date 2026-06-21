# Milestone 10 — Email channel (CF Email binding) + delivery pipeline & status tracking

**Phase:** 1 · **Depends on:** M08, M09 · **Status:** Done

## Goal
Ship the first true end-to-end send: a composed notification persists as one `notification` row plus
one `delivery` row per channel attempt. The **email channel uses the Cloudflare Email binding** via
`@renderical/mailer` — no OAuth, no external SMTP credentials. The Create page actually sends;
the Channels page shows the real email connection status.

## Why it matters
Email via the CF binding is zero-config for users: no account to link, no credentials to rotate. The same
M08 connection lifecycle applies where relevant; for email the connection row requires no stored secrets.

## Current state
- `@renderical/mailer` sends auth transactional emails (verify, reset, 2FA) via the CF `EMAIL` binding.
- Channel registry + `ChannelAdapter` interface exist from M08; compose schema + transform stubs from M09.
- `sendNotificationEmail` exported from `packages/mailer/src/index.ts` (uses `binding().send()`).

## Scope (in)
- `notification` and `delivery` tables (wrangler D1 migration + Kysely `DB` interface, user-scoped).
- `emailAdapter` implementing the M08 `ChannelAdapter` interface:
  - `validateConfig`: accepts optional `{ from?: string }` (falls back to `noreply@renderical.com`).
  - `transform`: `ComposePayload` → `{ to, from, subject, html, text }`.
  - `send`: calls `sendNotificationEmail` from `@renderical/mailer` (CF Email binding). Returns `SendResult`.
  - `healthCheck`: validates the `from` config address if present.
- `POST /api/notifications` — validate compose payload, create `notification`, fan out to email,
  create `delivery`, invoke adapter, persist status.
- `GET /api/notifications` (paginated list) and `GET /api/notifications/:id` (with deliveries).
- Wire `create.tsx` to send via the compose dialog.
- Wire `channels.tsx` to show the real email connection state (always-connected for CF binding).
- Architecture simplification applied in this milestone:
  - better-auth organization plugin removed from `apps/api/src/lib/auth.ts`.
  - `requireAuth` is the only auth middleware on all product routes.
  - All product tables use `userId` FK (no `organizationId`).
  - 7 channel types: `email | webhook | web_push | sms | whatsapp | telegram | in_app` (extended to 10 by M18–M19: + slack, discord, teams).

## Out of scope (deferred)
- Queueing, retries, idempotency → M20.
- Open/click/bounce receipts → M21.
- Non-email channels → M11, M13–M17.
- Scheduling → M22.

## Data model
Wrangler D1 migration (`apps/api/migrations/0003_notifications.sql`):
```sql
CREATE TABLE "notification" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "payload" text not null,
  "subject" text,
  "channels" text not null,
  "mode" text not null default 'transactional',
  "status" text not null default 'processing',
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "notification_user_createdAt_idx" ON "notification" ("userId", "createdAt", "id");
CREATE INDEX "notification_user_status_idx" ON "notification" ("userId", "status");

CREATE TABLE "delivery" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "notificationId" text not null references "notification"("id") on delete cascade,
  "channel" text not null,
  "recipient" text not null,
  "status" text not null default 'queued',
  "providerMessageId" text,
  "error" text,
  "attempts" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "delivery_notificationId_idx" ON "delivery" ("notificationId");
CREATE INDEX "delivery_user_status_idx" ON "delivery" ("userId", "status");
```

Kysely interfaces:
```ts
export interface NotificationTable {
  id: string
  userId: string
  payload: string
  subject: string | null
  channels: string
  mode: string
  status: string
  createdAt: string
  updatedAt: string
}
export interface DeliveryTable {
  id: string
  userId: string
  notificationId: string
  channel: string
  recipient: string
  status: string
  providerMessageId: string | null
  error: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}
```

## API surface
- `POST /api/notifications` — body = `ComposePayload`; auth: `requireAuth`. Returns
  `{ notification, deliveries }`.
- `GET /api/notifications?limit&cursor&status=` — keyset pagination, `status` filter.
- `GET /api/notifications/:id` — with deliveries array.

All endpoints scoped to `c.var.user!.id`; cross-user reads are impossible.

## Frontend
- `packages/core/src/hooks/notifications.ts`: `notificationKeys`, `useSendNotification`,
  `useNotifications`, `useNotification`.
- `packages/views/src/pages/create.tsx`: compose dialog with `useSendNotification`.
- `packages/views/src/pages/channels.tsx`: 11 channel cards; email shown as always-connected.

## Implementation steps
1. Write `apps/api/migrations/0003_notifications.sql`; add `NotificationTable`/`DeliveryTable` to `DB`.
2. Create `apps/api/src/channels/email.ts`: `emailAdapter` — `validateConfig`, `transform`, `send`
   (calls `sendNotificationEmail`), `healthCheck`. Register with `registerAdapter`.
3. Create `apps/api/src/routes/notifications.ts`; call `adapter.transform` then `adapter.send`.
4. Mount router in `apps/api/src/index.ts`.
5. Apply migration with `wrangler d1 migrations apply DB --local`.
6. Build `packages/core/src/hooks/notifications.ts`; wire `create.tsx` and `channels.tsx`.

## Acceptance criteria
- [x] `POST /api/notifications` with `{channels:['email'], recipient.contact.email, content}` creates
      1 `notification` + 1 `delivery` row.
- [x] A failed send records `delivery.status='failed'` with a populated `error`; no 500.
- [x] `GET /api/notifications` returns only the caller's notifications; `:id` includes deliveries.
- [x] `GET /api/notifications` paginates, caps limit at 100, honors `status` filter, returns `422`
      for unknown sort/filter fields.
- [x] Channels page shows 11 channel cards; email is always-connected.
- [x] Create page compose dialog sends a real notification and shows per-delivery status.
- [x] No `organizationId` anywhere in product routes or DB schema.
- [x] `pnpm typecheck` passes with 11-type `ChannelType`; `pnpm build` passes.

## Risks & notes
- Set `EMAIL_LOG_ONLY=true` in `.dev.vars` for local dev to log emails instead of attempting CF binding send.
- `delivered` is **optimistic** — set on successful CF binding hand-off. True delivery/bounce state
  arrives in M21.
- Store the full compose `payload` JSON for audit/replay.
