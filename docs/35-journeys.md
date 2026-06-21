# Milestone 35 — Workflows & multi-step journeys

**Phase:** 10 · **Depends on:** M23, M29 (routing), M30 (rate-limiting) · **Status:** Done

## Goal
Run automated, multi-step journeys: a recipient is **enrolled** (by event trigger or manually), then advances
through **send / wait / branch / exit** steps, persisting state between steps and resuming on a schedule.

## Why it matters
Single sends become lifecycle automation — onboarding drips, re-engagement, escalations. The engine ties
together templates, scheduling, routing, and rate limiting into orchestrated flows.

## Current state
- M23 added scheduling + the cron sweep (`scheduling/sweep.ts`); M29 routing and M30 rate limiting exist.
- M10 send pipeline + `DELIVERY_Q` are in place; no orchestration/state-machine concept existed.

## Scope (in)
- **`journey`**: user-scoped definition (name, status, `trigger` JSON, `steps` JSON).
- **`journey_run`**: per-recipient execution state (status, currentStepId, nextResumeAt, `context` JSON),
  UNIQUE on `(journeyId, recipientId)` so a recipient enrolls once.
- **`journey_event`**: the event log that drives triggers.
- **`advanceJourneyRun(run, db, env, depth=0)`** engine:
  - `send` — creates notification+delivery rows, enqueues `DELIVERY_Q` with idempotency key `journey:{runId}:{stepId}`
  - `wait` — sets `nextResumeAt` and returns
  - `branch` — evaluates FilterNode conditions in-memory against `run.context`, advances to the matching branch
  - `exit` — sets status `completed`
  - recursion capped at 50 steps per invocation
- **Resume**: the cron sweep picks up active runs whose `nextResumeAt <= now` (batched) and advances them.
- **Triggers**: `POST /api/events` logs an event, finds active journeys whose trigger matches, resolves the
  recipient, inserts a `journey_run` (UNIQUE conflict = already enrolled), and advances it.

## Data model
Migration `apps/api/migrations/0028_journeys.sql`:
- `journey` (id, userId FK, name, status, trigger JSON, steps JSON, createdAt, updatedAt)
- `journey_run` (id, userId FK, journeyId FK, recipientId FK, status, currentStepId, nextResumeAt, context
  JSON, createdAt, updatedAt) UNIQUE on `(journeyId, recipientId)` + a resume index on `nextResumeAt`
- `journey_event` (id, userId FK, name, recipientId, payload JSON, createdAt)

Kysely `JourneyTable`, `JourneyRunTable`, `JourneyEventTable` added to `DB`.

## API surface
`requireAuth`, user-scoped:
- `GET/POST /api/journeys`, `GET/PATCH/DELETE /api/journeys/:id`
- `POST /api/journeys/:id/activate`
- `GET /api/journeys/:id/runs` (keyset paginated)
- `POST /api/journeys/:id/enroll` (manual enrollment by recipientId)
- `POST /api/events` (trigger path)

## Frontend
- `packages/views/src/pages/journeys.tsx` — journey list, detail dialog (definition / runs / enroll tabs).
- `packages/core/src/hooks/journeys.ts` — `useJourneys`, `useJourney`, `useJourneyRuns`, `useCreateJourney`,
  `useUpdateJourney`, `useDeleteJourney`, `useActivateJourney`, `useEnrollRecipient`, `useTriggerEvent`.
- Journeys route in `_shared.tsx`; Journeys nav item in `app-sidebar.tsx`.
- Types `Journey`, `JourneyRun`, `JourneyEvent` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interfaces (per M05).
2. `apps/api/src/lib/journey-engine.ts`: `advanceJourneyRun()` with send/wait/branch/exit + 50-step cap.
3. `apps/api/src/routes/events.ts`: trigger path (log → match → enroll → advance).
4. `apps/api/src/routes/journeys.ts`: CRUD + activate + runs + enroll.
5. Extend `scheduling/sweep.ts` to advance due runs.
6. Journeys page + hooks + nav.

## Acceptance criteria
- [x] A journey can be created, activated, and enrolled (manually or by event trigger).
- [x] `send` steps deliver via the normal pipeline with the `journey:{runId}:{stepId}` idempotency key.
- [x] `wait` steps suspend the run and resume from the cron sweep once due.
- [x] `branch` steps route on conditions evaluated against `run.context`.
- [x] A recipient enrolls at most once per journey (UNIQUE on `(journeyId, recipientId)`).
- [x] All journeys/runs/events are user-scoped via `requireAuth`.

## Risks & notes
- Branch conditions are evaluated in-memory against the run context (a Worker-side object), not SQL.
- The 50-step recursion cap bounds a single invocation; long waits resume via the sweep.
- Send steps use the idempotency key to prevent the sweep from double-sending on retry.
