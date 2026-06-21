# Milestone 21 — Delivery queue: retries, exponential backoff, dead-letter queue & idempotency keys

**Phase:** 4 · **Depends on:** M10 · **Status:** Done

## Goal
Move send execution off the request path onto a Cloudflare Queue: `POST /api/notifications` enqueues, a
consumer worker runs the channel adapter, failures retry with exponential backoff, exhausted messages land
in a dead-letter queue, and idempotency keys prevent duplicate sends.

## Why it matters
M10 sends inline during the HTTP request — slow, fragile, and lost if the worker dies mid-send. Reliable
delivery (the platform's core promise) needs async execution, bounded retries, a place for poison
messages, and dedupe so a retried API call doesn't double-notify a user.

## Current state
- M10 created `notification` + `delivery` and sends inline, recording `queued→sent→delivered→failed`.
- M09's compose schema already carries an `idempotencyKey`.
- No queue is configured in `apps/api/wrangler.jsonc` yet.

## Scope (in)
- **Producer**: `POST /api/notifications` validates + persists the notification and `delivery` rows
  (status `queued`), then enqueues one queue message per delivery and returns immediately.
- **Consumer**: a `queue()` handler in the Worker that loads the delivery, resolves the adapter (M08),
  runs `transform`+`send` (M09/M10), and updates status `sent`/`failed`/`retrying`.
- **Retries + backoff**: use Cloudflare Queues' `retry()` with increasing `delaySeconds` (exponential, e.g.
  base 2 with jitter) up to `max_retries`; record `attempts` on the delivery.
- **Dead-letter queue**: configure a DLQ binding; exhausted messages move to a `dead_letter` table (and/or
  the DLQ) with the last error, surfaced to operators (the deliveries/logs views).
- **Idempotency**: an `idempotency_key` table (org-scoped, key, notificationId, createdAt, TTL window); a
  duplicate `idempotencyKey` within the window returns the original notification instead of sending again.
- **Status transitions**: formalize `queued → retrying → sent → (delivered, M22) | failed | dead`.

## Out of scope (deferred)
- `delivered`/`opened`/`clicked` receipts & bounce handling → M22.
- Scheduled / future-dated sends → M23 (those enqueue at fire time).
- Per-recipient rate-aware throttling beyond retry/idempotency → M30 (rate limiting).

## Data model
- `delivery` (M10): add `attempts` (int), `nextRetryAt?`, `lastError?`.
- `idempotency_key`: user-scoped, `key`, `notificationId`, `expiresAt`, unique on `(userId, key)`.
- `dead_letter`: user-scoped, `deliveryId`, `channel`, `notificationId`, `reason`/`errorCode`, `payload` (json), `error`, `failedAt`, `createdAt`.
  - M06 list-query indexes for `GET /api/deliveries/dead`: index `(userId, failedAt, id)` (keyset
    default sort) and the filterable columns `(userId, channel)` and `(userId, notificationId)`.

## API surface
- `POST /api/notifications` — now enqueues; response includes `notificationId` + per-channel `delivery` ids
  with status `queued`. Honors `idempotencyKey` (returns the original on duplicate).
- `POST /api/deliveries/:id/retry` — manual requeue of a `failed`/`dead` delivery (`requireAuth`).
- `GET /api/deliveries/dead` — list DLQ items for the org.
  - **List query (M06 contract)** — DLQ entries grow with failure volume on a LARGE table, so **keyset
    `cursor` pagination is mandatory** (no `offset`/`page`).
    - **Default sort:** `failedAt desc` (fall back to `createdAt desc`; tiebreaker `id`).
    - **Sortable allow-list:** `failedAt`/`createdAt` → the dead-letter timestamp column, `attempts` →
      `delivery.attempts`.
    - **Filterable allow-list:** `channel` (eq/in, validated against the channel registry), `notificationId`
      (eq), `reason`/`errorCode` (eq over the recorded last-error classification).
    - **Pagination mode:** keyset cursor encoding the active sort key + `id` tiebreaker.
    - **Key checks:** `limit` capped at 100; unknown sort/filter field or operator → `422`; all filters
      parameter-bound and AND-ed with the mandatory `userId` scope; malformed/tampered `cursor` →
      `422`; stable `id` tiebreaker.

## Frontend
- Create page (`packages/views/src/pages/create.tsx`): reflect async status (queued) and let the client
  poll `GET /api/notifications/:id` for progress.
- Logs page wiring is M34; this milestone just ensures statuses are accurate to display later.

## Implementation steps
1. Configure the queue + DLQ in `apps/api/wrangler.jsonc` (`[[queues.producers]]` binding e.g. `DELIVERY_Q`,
   `[[queues.consumers]]` with `max_retries`, `dead_letter_queue`).
2. Refactor `POST /api/notifications` (M10) into a pure producer: persist + enqueue, no inline send.
3. Add the `queue()` export to the Worker; implement the consumer (load delivery → adapter → send → status),
   calling `message.retry({ delaySeconds })` on retryable errors and `message.ack()` on success/terminal.
4. Add the `idempotency_key`, `dead_letter` tables + the `attempts`/`nextRetryAt`/`lastError` columns; add a wrangler D1 migration (apply: `wrangler d1 migrations apply DB --local`) and extend the Kysely `DB` interface (M05).
5. Implement idempotency check in the producer; implement DLQ landing in the consumer's exhausted path.
6. Add the retry + dead-letter endpoints.

## Acceptance criteria
- [x] `POST /api/notifications` returns immediately with `queued` deliveries; the send happens in the consumer.
- [x] A transient provider failure retries with exponential backoff and eventually succeeds (status `sent`).
- [x] After `max_retries`, the delivery is `dead` and appears in `GET /api/deliveries/dead`.
- [x] `GET /api/deliveries/dead` paginates by keyset `cursor` (default `failedAt desc`, `id` tiebreaker),
      caps `limit` at 100, honors allow-listed `channel`/`notificationId`/`reason` filters and `attempts`
      sort, stays user-scoped, and returns `422` for an unknown sort/filter field, operator, or tampered `cursor`.
- [x] Re-POSTing with the same `idempotencyKey` within the window returns the original notification (no duplicate send).
- [x] `attempts`/`lastError` are recorded per delivery.

## Risks & notes
- Idempotency must be checked at the producer **before** enqueue, and the key window documented (e.g. 24h).
- Keep adapter `send()` errors classified (retryable vs terminal) so non-retryable failures (bad recipient)
  go straight to `failed`/`dead` without burning retries.
- M22 (receipts) and M23 (scheduling) both build on this consumer — keep it small and well-typed.
