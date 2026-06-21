# Milestone 24 — Recurring/cron sends

**Phase:** 5 · **Depends on:** M23 · **Status:** Done

## Goal
Add recurring/cron-style notification definitions that the M23 scheduler expands into concrete sends on a schedule.

## Why it matters
Digests, weekly summaries, and reminders need to repeat on a schedule without re-creating them each time.

## Current state
- M23 added `scheduled_message`, recipient timezones, quiet hours, and a Cron-sweep scheduler that enqueues due messages onto the M21 queue.
- No recurring definitions exist yet.

## Scope (in)
- **Recurring definitions**: a `recurring_send` table (user-scoped, compose payload/template ref, cron expression + timezone, `nextRunAt`, `enabled`, `lastRunAt`).
- **Expansion**: extend the M23 Cron sweep to also evaluate `recurring_send` rows whose `nextRunAt` is due, materialize a concrete `scheduled_message`/send for this occurrence, then compute the next `nextRunAt`.

## Out of scope
- Multi-step journeys / branching sequences → M35 (recurring is single-step repetition).
- Analytics dashboards over recurring performance → M33.

## Data model
Migration: `apps/api/migrations/0013_recurring_send.sql`

```sql
CREATE TABLE "recurring_send" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "payload" text not null,
  "channels" text not null,
  "cron" text not null,
  "timezone" text not null,
  "nextRunAt" text not null,
  "lastRunAt" text,
  "enabled" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "recurring_send_user_next_idx" ON "recurring_send" ("userId", "enabled", "nextRunAt");
```

```ts
export interface RecurringSendTable {
  id: string; userId: string; payload: string; channels: string; cron: string; timezone: string
  nextRunAt: string; lastRunAt: string | null; enabled: number; createdAt: string; updatedAt: string
}
```

## API surface
- `POST /api/recurring` / `GET /api/recurring` / `PATCH /api/recurring/:id` / `DELETE /api/recurring/:id` — manage recurring definitions (`requireAuth`).
  - List query (M06 contract): default sort `createdAt desc`; keyset cursor on `(createdAt, id)`.
  - Sortable: `createdAt`, `nextRunAt`. Filterable: `enabled` (eq), `channel` (eq/in). AND-ed with `userId` scope; unknown sort/filter → `422`.
- `GET /api/recurring/:id/runs` — recent materialized occurrences (the `scheduled_message` rows tagged with `recurringSendId`).

## Frontend
- `packages/views/src/pages/schedules.tsx`: "Recurring" tab alongside one-off scheduled sends — list definitions with cadence, next run, enable/disable, and run history.
- `packages/core/src/hooks/schedules.ts`: `useRecurringSends`, `useCreateRecurringSend`, `useUpdateRecurringSend`, `useDeleteRecurringSend`.

## Acceptance criteria
- [x] A recurring definition materializes a concrete send each period and correctly advances `nextRunAt`.
- [x] Disabling a recurring definition stops future occurrences without affecting already-scheduled ones.
- [x] The Schedules "Recurring" tab shows cadence, next run, and run history from real data.
- [x] `GET /api/recurring` returns `{ data, nextCursor }`, defaults to `createdAt desc`, supports `enabled`/`channel` filters within user scope, rejects unknown sort/filter keys with `422`.

## Risks & notes
- Recurrence math is timezone-sensitive — use date-fns with IANA TZ for `nextRunAt` calculation.
- Sweep must be idempotent; advance `nextRunAt` only after the occurrence is materialized.
