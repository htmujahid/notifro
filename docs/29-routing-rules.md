# Milestone 29 — Routing rules & fallback chains

**Phase:** 7 · **Depends on:** M28, M05–M07 · **Status:** Done

## Goal
Pick the delivery channel(s) for a notification by **rule** rather than by an explicit `channels` array, and
**escalate** through an ordered **fallback chain** (e.g. push → email → SMS) when an earlier step doesn't
succeed within a wait window.

## Why it matters
A single notification should reach the recipient on whatever channel works, without the caller hardcoding
the fan-out. Rules let the owner express "urgent → SMS first", and chains guarantee a message escalates
instead of silently failing on one channel.

## Current state
- M10–M20 provide the channel adapters and the `notification` → `delivery` pipeline.
- M21 runs delivery async on `DELIVERY_Q` with retries/DLQ; M28 stores per-recipient channel priority.
- Channel selection was previously only the explicit `channels` array on the send request.

## Scope (in)
- **`routing_rule`**: user-scoped, ordered by `priority`, with an enabled flag and a JSON `match` (priority /
  messageType / time-window predicates); resolves to either a single channel or a fallback chain.
- **`fallback_chain`**: user-scoped, named, holds an ordered JSON `steps[]` (`{channel, connectionId?,
  waitForDeliveryMs, successOn[]}`).
- **`resolveRoute()`**: evaluates enabled rules in priority order against notification metadata; returns
  `{type:'channel'}` or `{type:'chain', chainId, steps}`.
- **Chain escalation**: a successful step that requires more than `delivered` (e.g. `opened`) schedules a
  delayed escalation-check; a terminal failure with a `chainId` advances to the next step. Idempotency guard
  `chain:{notificationId}:{stepIndex}`; chain length capped at 10.

## Data model
Migration `apps/api/migrations/0022_routing_schema.sql`:
- `fallback_chain` (id, userId FK, name, steps JSON, createdAt, updatedAt)
- `routing_rule` (id, userId FK, priority, enabled, match JSON, targetChainId, targetChannel, createdAt, updatedAt)
- 3 columns added to `delivery`: `chainId`, `chainStepIndex`, `escalatedFromDeliveryId` (all nullable)

Kysely interfaces `FallbackChainTable`, `RoutingRuleTable` + the new nullable `DeliveryTable` columns, added to `DB`.

## API surface
`requireAuth`, user-scoped:
- `GET/POST/PATCH/DELETE /api/routing/rules`
- `POST /api/routing/resolve` — dry-run a route against a sample notification
- `GET/POST/PATCH/DELETE /api/routing/chains`

## Frontend
- `packages/views/src/pages/routing.tsx` — rules table (priority, match summary, target, enabled toggle,
  delete), chains list (step badges with wait times), create-rule and create-chain dialogs.
- `packages/core/src/hooks/routing.ts` — rule + chain queries/mutations + `useResolveRoute`.
- Routing route in `_shared.tsx`; Routing nav item in `app-sidebar.tsx`.
- Types: `ChainStep`, `FallbackChain`, `RoutingRule` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interfaces (per M05).
2. `apps/api/src/lib/routing.ts`: `resolveRoute()` and `escalateChain()` (enqueues next-step delivery with
   the idempotency guard, caps at 10).
3. `notifications.ts`: resolve a route (explicit `chainId` or `resolveRoute`) before fan-out; stamp
   `chainId`/`chainStepIndex=0`/`escalatedFromDeliveryId=null` on the step-0 delivery.
4. `consumer.ts`: extend `DeliveryQueueMessage` with `escalationCheck?: boolean`; on a successful step whose
   `successOn` needs more than `delivered`, schedule a delayed escalation-check message; on terminal failure
   with `chainId`, call `escalateChain`.
5. Routing rule + chain CRUD routes; frontend page, hooks, nav.

## Acceptance criteria
- [x] A routing rule selects the channel for a send with no explicit `channels` array.
- [x] A fallback chain escalates to the next step on terminal failure of the current step.
- [x] `successOn` containing `opened`/`clicked` defers escalation until the wait window elapses.
- [x] Escalation is idempotent (`chain:{notificationId}:{stepIndex}`); chains never exceed 10 steps.
- [x] All rules/chains are user-scoped via `requireAuth`; `POST /api/routing/resolve` returns the dry-run route.

## Risks & notes
- Segment sends bypass chain routing (resolved chain is null for segment fan-out).
- Channel priority from M28 is available to rules; failover at the *provider* level (not channel) is M36.
