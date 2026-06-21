# Milestone 30 — KV-backed rate limiting

**Phase:** 7 · **Depends on:** M21, M05–M07 · **Status:** Done

## Goal
Cap how many notifications a user sends per channel per rolling window, enforced cheaply at send time with a
Cloudflare KV counter backed by a D1-stored rule.

## Why it matters
Runaway loops, misconfigured journeys, or a buggy integration can fan out thousands of sends. A per-channel
rate limit protects provider quotas, cost, and sender reputation without a heavyweight counting store.

## Current state
- M21 runs delivery async on `DELIVERY_Q`; `notifications.ts` already gates each delivery on preferences (M28).
- No throttling primitive exists (the earlier frequency-cap/digest milestone was reverted as out of scope).

## Scope (in)
- **`rate_limit_rule`**: user-scoped, one rule per channel (`maxCount`, `windowSeconds`).
- **`checkRateLimit(kv, db, userId, channel, nowMs)`**: loads the rule, computes an epoch-aligned window id,
  reads/increments a KV counter, returns `'allow'` or `'exceeded'`. No rule → `'allow'`.
- **Pipeline placement**: runs in `notifications.ts` after the preference gate; rate-limited deliveries are
  inserted as `status='skipped'`, `error='rate_limit:exceeded'`.

## Data model
Migration `apps/api/migrations/0023_rate_limit_rules.sql`:
- `rate_limit_rule` (id, userId FK, channel, maxCount, windowSeconds, createdAt, updatedAt) with a UNIQUE
  index on `(userId, channel)`.

Kysely `RateLimitRuleTable` added to `DB`.

KV namespace `RATE_LIMIT_KV` in `apps/api/wrangler.jsonc`; `RATE_LIMIT_KV: KVNamespace` in
`worker-configuration.d.ts`. KV key shape `rl:{userId}:{channel}:{windowId}`, TTL `windowSeconds × 2`.

## API surface
`requireAuth`, user-scoped:
- `GET/POST/PATCH/DELETE /api/rate-limits` — POST upserts by `(userId, channel)` via `ON CONFLICT DO UPDATE`.

## Frontend
- `RateLimitsSection` in `packages/views/src/pages/settings.tsx` — CRUD table (channel / maxCount /
  windowSeconds / delete) + create form.
- `packages/core/src/hooks/rate-limits.ts` — `useRateLimits`, `useUpsertRateLimit`, `useUpdateRateLimit`,
  `useDeleteRateLimit`.
- Type `RateLimitRule` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interface (per M05); create the `RATE_LIMIT_KV` namespace and wire bindings.
2. `apps/api/src/lib/rate-limit.ts`: `checkRateLimit()` with epoch-aligned window + KV increment.
3. Insert the check into both the segment and non-segment send loops in `notifications.ts`, after the
   preference gate; record `skipped` deliveries.
4. Rate-limit CRUD route (upsert by channel); Settings UI + hooks.

## Acceptance criteria
- [x] With a rule of N per window, the (N+1)th send in the window is recorded `skipped:rate_limit:exceeded`.
- [x] No rule for a channel → all sends allowed.
- [x] The counter resets at the next epoch-aligned window.
- [x] Rules are user-scoped; POST upserts the existing rule for a channel rather than duplicating it.

## Risks & notes
- KV read-then-write is non-atomic; accepted for single-user rate limiting (no cross-user contention).
- This caps total volume per channel; per-recipient frequency capping is intentionally out of scope.
