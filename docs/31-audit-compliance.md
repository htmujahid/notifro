# Milestone 31 — Audit log, suppression & consent ledger

**Phase:** 9 · **Depends on:** M22 · **Status:** Done

## Goal
Make sends legally defensible: a **suppression list** that blocks delivery to bounced/complained addresses,
an append-only **consent ledger** recording every suppression event with its source, and **PII redaction**
on stored error/log text.

## Why it matters
Suppression guarantees a hard-bounced or complained address never gets contacted again; the consent ledger
is the audit trail; redaction keeps PII out of logs.

## Current state
- M22 added bounce receipts on `delivery`.
- `apps/api/src/lib/suppress.ts` was a stub; no consent ledger or redaction existed.

## Scope (in)
- **`suppression`**: user-scoped (channel, address, reason), UNIQUE on `(userId, channel, address)` — a hard
  block consulted at send time.
- **`consent_event`**: append-only ledger (channel, event, source, actorNote).
- **`suppress()`**: inserts a suppression row + a consent_event in one call; **`isSuppressed()`** checks the
  list; **`recordConsentEvent()`** writes a standalone ledger entry.
- **`redactPii(text)`**: replaces email/phone patterns with `[email]`/`[phone]`.
- **Pipeline integration**: a suppression gate in `notifications.ts` and in `consumer.ts` (before
  `adapter.send`); `redactPii` applied to `sendError` and the request-log path.
- **Source integration**: hard bounces call `suppress(..., 'hard_bounce')`; complaints call
  `suppress(..., 'complaint')`.

## Data model
Migration `apps/api/migrations/0021_suppression.sql`:
- `suppression` (id, userId FK, channel, address, reason, createdAt) UNIQUE on `(userId, channel, address)`
- `consent_event` (id, userId FK, channel, event, source, actorNote, createdAt) with an index on
  `(userId, createdAt desc)`

Kysely `SuppressionTable`, `ConsentEventTable` added to `DB`.

## API surface
`requireAuth`, user-scoped (`apps/api/src/routes/compliance.ts`):
- `GET/POST/DELETE /api/compliance/suppressions` — list (filter channel/reason), manual add (writes a consent_event), remove
- `GET /api/compliance/consent-events` — read-only ledger, paginated desc

## Frontend
- `ComplianceSection` in `packages/views/src/pages/settings.tsx` — suppressions table (add/delete) +
  consent event log.
- `packages/core/src/hooks/compliance.ts` — `useSuppressions`, `useAddSuppression`, `useDeleteSuppression`,
  `useConsentEvents`.
- Types `Suppression`, `ConsentEvent` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interfaces (per M05).
2. Implement `suppress()`, `isSuppressed()`, `recordConsentEvent()` in `lib/suppress.ts`; add `lib/redact.ts`.
3. Add suppression gates to `notifications.ts` and `consumer.ts`; apply `redactPii` to stored errors +
   the request-log path.
4. Wire consent_event writes into `receipts.ts` (hard bounce, complaint).
5. Compliance routes; `ComplianceSection` UI + hooks.

## Acceptance criteria
- [x] A suppressed `(channel, address)` is skipped at send (`status='suppressed'`), both at enqueue and in the consumer.
- [x] A hard bounce auto-suppresses the address and records a consent_event.
- [x] Stored error text and request-log paths have email/phone redacted.
- [x] Suppressions/consent events are user-scoped via `requireAuth`.

## Risks & notes
- The unique constraint makes `suppress()` idempotent (INSERT OR IGNORE on the suppression row).
- The consent ledger is append-only — entries are never updated or deleted.
