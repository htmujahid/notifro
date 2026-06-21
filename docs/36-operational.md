# Milestone 36 — Provider failover & health checks

**Phase:** 10 · **Depends on:** M21, M29 (routing) · **Status:** Done

## Goal
Keep delivery flowing when a provider connection fails: configure a **fallback connection** per channel that
the queue consumer switches to on a non-retryable failure, support an **APNs relay** for environments that
can't reach Apple directly, and expose a **health endpoint** for uptime monitoring.

## Why it matters
A single provider outage shouldn't drop notifications. Provider-level failover (distinct from M29's
channel-level chains) reroutes a failed send to a second connection on the *same* channel; the health check
lets external monitors verify the worker + database are live.

## Current state
- M21 runs delivery on `DELIVERY_Q` with retries/DLQ; M29 added channel-level fallback chains.
- Failure on a connection went straight to the dead-letter queue with no provider-level retry.

## Scope (in)
- **`provider_fallback`**: user-scoped, one rule per channel (`primaryConnectionId`, `fallbackConnectionId`),
  UNIQUE on `(userId, channel)`.
- **Consumer failover**: `DeliveryQueueMessage` gains `connectionId?`. When set, the consumer uses that exact
  connection (bypassing `resolveSendConnection`). On a **non-retryable** failure with **no** explicit
  `connectionId`, the consumer looks up a `provider_fallback` for `(userId, channel)`, inserts a new delivery
  row, and re-enqueues with the fallback `connectionId`. The `!connectionId` guard prevents infinite loops.
- **APNs relay**: `APNS_RELAY_URL` (optional env) overrides the APNs host in `sendApns()` — threaded from
  `SendContext.env` through the mobile-push adapter.
- **Health endpoint**: `GET /health` probes D1 with a count query and returns `{status, db, queue, ts}`
  (`200` ok, `503` on DB error).

## Data model
Migration `apps/api/migrations/0029_provider_fallback.sql`:
- `provider_fallback` (id, userId FK, channel, primaryConnectionId, fallbackConnectionId, createdAt) UNIQUE
  on `(userId, channel)`

Kysely `ProviderFallbackTable` added to `DB`. `APNS_RELAY_URL: string | undefined` added to
`worker-configuration.d.ts` and to the `SendContext.env` Pick in `apps/api/src/channels/adapter.ts`.

## API surface
`requireAuth`, user-scoped (`apps/api/src/routes/provider-fallbacks.ts`):
- `GET/POST/DELETE /api/provider-fallbacks` — POST upserts by `(userId, channel)` via `ON CONFLICT DO UPDATE`

Plus `GET /health` (unauthenticated liveness probe).

## Frontend
- `FailoverSection` in `packages/views/src/pages/settings.tsx` — fallback rules table (channel / primary /
  fallback / delete) + create form.
- `packages/core/src/hooks/failover.ts` — `useProviderFallbacks`, `useCreateProviderFallback`,
  `useDeleteProviderFallback`.
- Type `ProviderFallback` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interface (per M05).
2. Add `connectionId?` to `DeliveryQueueMessage`; in `consumer.ts`, use it directly when present, else
   `resolveSendConnection`.
3. Add the failover branch before dead-lettering: on non-retryable error with no `connectionId`, look up the
   fallback and re-enqueue with the fallback connection.
4. Thread `APNS_RELAY_URL` through `SendContext.env` → mobile-push adapter → `sendApns()`.
5. Add `GET /health` (D1 probe) and the `provider_fallback` CRUD route.
6. `FailoverSection` UI + hooks.

## Acceptance criteria
- [x] A non-retryable failure on a channel with a configured fallback re-enqueues to the fallback connection.
- [x] A fallback-triggered delivery (carrying `connectionId`) never triggers another failover (no loops).
- [x] `APNS_RELAY_URL`, when set, overrides the APNs host for mobile-push sends.
- [x] `GET /health` returns `200` with `db:'ok'` when D1 is reachable and `503` when it isn't.
- [x] Fallback rules are user-scoped via `requireAuth`; POST upserts by channel.

## Risks & notes
- Failover is provider-level (same channel, different connection); channel-level escalation is M29 chains.
- `queue:'ok'` in the health response is static — Workers don't expose queue health at runtime.
- One fallback rule per channel per user (UNIQUE on `(userId, channel)`); upsert via POST.
