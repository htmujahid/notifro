# Milestone 22 — Scheduling, timezones, quiet hours & time-window delivery

**Phase:** 5 · **Depends on:** M20 · **Status:** Done

## Goal
Let callers schedule sends for a future time with recipient-timezone awareness, enforce per-recipient
quiet hours / do-not-disturb, and restrict delivery to time windows (e.g. only 9am–5pm local) — with a
durable scheduler that enqueues due messages onto the M20 delivery queue.

## Why it matters
Transactional sends fire now; reminders and digests must fire later, in the recipient's local
time, without waking people at 3am. Scheduling + quiet hours are table-stakes for a notification platform
and a prerequisite for recurring sends (M23).

## Current state
- M20 delivers via a Cloudflare Queue; `POST /api/notifications` enqueues immediately.
- The compose schema (M09) can carry scheduling hints; no scheduling storage or scheduler exists.
- No recipient timezone or quiet-hours data is stored yet.

## Scope (in)
- **Scheduled messages**: a `scheduled_message` table (org-scoped, compose payload, `sendAt` UTC, computed
  per-recipient local time, status `pending|enqueued|cancelled`). `POST /api/notifications` with a
  `sendAt`/`scheduleFor` creates a scheduled row instead of enqueuing immediately.
- **Scheduler**: a Durable Object alarm per upcoming message **or** a `scheduled_message` table swept by a
  Cron Trigger (every minute) that enqueues all rows now due onto the M20 queue. Document the chosen
  approach; DO-alarms scale better for precise per-message timing, Cron sweep is simpler — recommend the
  Cron sweep first, DO alarms as an optimization.
- **Timezone awareness**: store recipient timezone (IANA, e.g. `America/New_York`) on a recipient profile;
  resolve "9am local" / "send-at local" to UTC at scheduling time, recomputing if the recipient TZ is unknown
  (fall back to org default).
- **Quiet hours / DND**: per-recipient (and org-default) quiet windows; a message due during quiet hours is
  deferred to the next allowed minute (or dropped if `respectQuietHours=false` for transactional/high priority).
- **Time-window delivery**: a channel/message option `deliveryWindow` (start–end local) that holds a send
  until inside the window.

## Out of scope (deferred)
- Recurring/cron definitions → M23.

## Data model
- `scheduled_message`: org-scoped, `payload` (json), `sendAt` (UTC), `status`, `channel`, `createdAt`,
  index on `(status, sendAt)` for the sweep — this also backs the `GET /api/schedules` default sort
  (`sendAt`) and the `status`/`from`/`to` filters; add a `(userId, sendAt, id)` index for the
  org-scoped keyset list and `createdAt` to the sortable index set.
- `recipient_profile` (or extend an existing recipient table): `timezone`, `quietHoursStart`,
  `quietHoursEnd`, `deliveryWindow?`.
- `recipient_profile`: default `timezone` + default quiet hours (user-level defaults).

## API surface
- `POST /api/notifications` — accepts `sendAt` (absolute) or `sendAtLocal` + recipient TZ; returns the
  `scheduled_message` id when deferred.
- `GET /api/schedules` — list pending/sent scheduled messages (org-scoped, paginated).
  - **List query (M06 contract):** default sort `sendAt asc` (upcoming first); keyset cursor on
    `(sendAt, id)`.
    - Sortable allow-list: `sendAt` → `sendAt`, `createdAt` → `createdAt`.
    - Filterable allow-list: `status` (eq/in — `pending|enqueued|cancelled`), `channel` (eq/in),
      `from` (`sendAt` gte), `to` (`sendAt` lte).
    - Filters AND-ed with the mandatory `userId` scope; unknown sort/filter key or operator →
      `422`; malformed cursor → `422`.
- `DELETE /api/schedules/:id` — cancel a pending scheduled message.
- `PATCH /api/recipients/:id/preferences` — set timezone / quiet hours.

## Frontend
- Wire `packages/views/src/pages/schedules.tsx` to `GET /api/schedules` (replace mock data): list upcoming
  sends with local-time display, status, and a cancel action.
- Compose page (M10): a "Schedule for later" picker (date/time + timezone) and a "respect quiet hours" toggle.

## Implementation steps
1. Add the `scheduled_message` + recipient timezone/quiet-hours columns; add a wrangler D1 migration (apply: `wrangler d1 migrations apply DB --local`) and extend the Kysely `DB` interface (M05).
2. Branch `POST /api/notifications`: if scheduled, persist a `scheduled_message`; else go straight to the M20 producer.
3. Add a Cron Trigger (`[triggers] crons = ["* * * * *"]`) + scheduled handler that selects due rows,
   applies quiet-hours/time-window deferral, and enqueues the rest onto the M20 queue (mark `enqueued`).
4. Implement TZ resolution + quiet-hours/time-window logic in a shared `scheduling/` module.
5. Wire the Schedules page and the compose scheduler UI; add `useSchedules()` hook (M07 convention).
6. (Optional) Add a Durable Object alarm path for sub-minute precision on high-priority scheduled sends.

## Acceptance criteria
- [x] A message scheduled for a future local time is stored, then enqueued at the correct UTC instant.
- [x] A send that would land inside a recipient's quiet hours is deferred to the next allowed time (unless
      overridden for transactional priority).
- [x] A time-window-restricted send holds until inside the window.
- [x] The Schedules page shows real upcoming sends in the recipient's local time and supports cancel.
- [x] `GET /api/schedules` returns `{ data, nextCursor }`, defaults to `sendAt asc`, honors the
      `status`/`channel`/`from`/`to` allow-listed filters within org scope, and rejects an unknown
      sort/filter key or a tampered cursor with `422` (M06 contract).

## Risks & notes
- DST + IANA correctness: compute local↔UTC with a proper TZ library (the project already uses `date-fns`
  in `@renderical/ui`); avoid fixed UTC offsets.
- The Cron sweep must be idempotent and bounded (page through due rows) so a slow minute doesn't double-enqueue.
- Quiet-hours overrides must never silently swallow truly transactional/critical messages — make the policy explicit.
