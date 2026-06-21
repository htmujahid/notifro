# Milestone 12 — First-run onboarding wizard, dashboard home & empty states

**Phase:** 2 · **Depends on:** M08, M10, M11 (richer metrics from M33 optional) · **Status:** Done

## Goal
Turn the mock home screen into a real activation surface: wire `dashboard.tsx` to live overview data,
give every product page a proper empty state, and add a first-run onboarding checklist that walks a new
user from zero to "first notification delivered" (connect a channel → send a test → see it land).

## Why it matters
This is the **activation path** — the first five minutes that decide whether a new org sticks. Today a
freshly-signed-up user lands on a dashboard
of hardcoded numbers and mock cards, with no guidance and no "you have nothing yet" states. The engine
(M08–M11) can connect a channel and deliver a message, but nothing guides the user to do it.

## Current state
- `packages/views/src/pages/dashboard.tsx` (+ `home.tsx`/`home.web.tsx`/`home.desktop.tsx`) render
  **hardcoded** metrics and activity with local `useState` — no API calls. `dashboard.tsx` is the index
  route in `packages/views/src/routes/web.tsx`; it is **not wired by any other milestone**.
- The app shell exists: `packages/core/src/layouts/app-layout.tsx`,
  `layouts/components/{app-sidebar,site-header,nav-user,quick-create-dialog}.tsx`.
- Channels/connections (M08), the `notification`/`delivery` pipeline + `POST /api/notifications` (M10), and
  the in-app inbox (M11) all exist. There is **no onboarding state, no empty-state component, no overview
  endpoint**.
- Data-fetching convention = `@renderical/api-client` (M07) + TanStack Query hooks mirroring
  `packages/core/src/hooks/connections.ts`. Auth via better-auth + `requireAuth` (M06).

## Scope (in)
- **Overview endpoint** `GET /api/overview` (user-scoped): counts + small aggregates the dashboard needs —
  connected channels, notifications sent (last 7/30d), delivery success rate, recent activity (latest N
  notifications with status), unread inbox count. Cheap Kysely aggregates over `notification`/`delivery`/
  `connection`/`inbox_message`; no new heavy rollups (M33 can later back it with `metric_rollup`).
- **Onboarding state** — track per-user checklist completion so the wizard is dismissible and resumable.
- **Onboarding checklist/wizard** — a dashboard banner + dedicated `/onboarding` view with steps:
  (1) connect your first channel (links to Channels, M08), (2) send a test notification (a one-click "send
  test to me" using M10), (3) explore channels, (4) explore
  templates (M24/M25, link only). Steps auto-complete by detecting real state (a connection exists, ≥1
  delivery succeeded); dismissable once done.
- **Wire `dashboard.tsx`** to `GET /api/overview`; show the onboarding checklist when incomplete, the
  metrics/recent-activity view when active.
- **Reusable empty-state component** in `@renderical/ui` (or `@renderical/core`) and applied to the mock
  pages' "no data" cases (channels with no connections, logs with no sends, templates with none, etc.).

## Out of scope (deferred)
- Rich charts / funnels / cost on the dashboard → that's the Analytics page (M33); the overview shows
  summary tiles only.
- A product-tour/coachmarks library → checklist only here.
- Settings page (built incrementally, no dedicated milestone).

## Data model
```sql
-- onboarding progress per user (one row); steps stored as a JSON set of completed step keys
CREATE TABLE "onboarding_state" (
  "userId" text not null primary key references "user"("id") on delete cascade,
  "completedSteps" text not null default '[]', -- JSON array of step keys
  "dismissed" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
```
```ts
// add to the Kysely DB interface (M05)
export interface OnboardingStateTable {
  userId: string
  completedSteps: string // JSON array
  dismissed: number
  createdAt: string
  updatedAt: string
}
// DB: { ...; onboarding_state: OnboardingStateTable }
```
Add a wrangler D1 migration in `apps/api/migrations/` (apply: `wrangler d1 migrations apply DB --local`)
and extend the Kysely `DB` interface (per M05). Most checklist steps are **derived** from real data
(connection/delivery existence) and only memoized here; `dismissed` and any non-derivable steps persist.

## API surface
- `GET /api/overview` — user-scoped (`requireAuth`, M06): `{ channels, sent7d, sent30d, successRate,
  recentActivity[], unreadInbox, onboarding }`. The `onboarding` block reflects derived + stored step state.
- `POST /api/overview/test-send` — fire a sample notification to the current user (reuses M10 pipeline,
  email/in-app), so the wizard's "send a test" step works in one click.
- `PATCH /api/onboarding` — mark a step complete / dismiss the checklist.

## Frontend
- New hooks `packages/core/src/hooks/overview.ts`: `useOverview()`, `useSendTest()`, `useOnboarding()`
  (mutation) — typed via `@renderical/api-client` (M07), `overviewKeys` query-key factory like
  `hooks/connections.ts`.
- Wire `packages/views/src/pages/dashboard.tsx` (and the `home.*` variants): replace mock data with
  `useOverview()`; render `<OnboardingChecklist/>` when `onboarding.complete === false`, else the
  summary tiles + recent activity.
- New `packages/views/src/pages/onboarding.tsx` + a route in `packages/views/src/routes/_shared.tsx`
  (`sharedProtectedChildren`).
- New `<EmptyState/>` component (`@renderical/ui/components/empty-state`) — icon, title, body, primary CTA;
  apply to channels/logs/templates/audiences/schedules pages' no-data branches.

## Implementation steps
1. Add the `onboarding_state` table (migration + Kysely interface, per M05).
2. Build `apps/api/src/routes/overview.ts` (`GET /api/overview`, `POST /api/overview/test-send`,
   `PATCH /api/onboarding`) using `createRoute`+`app.openapi`, behind `requireAuth` (M06). Compute counts
   with Kysely aggregates; derive checklist steps from `connection`/`delivery` existence.
3. Add the `overview` hooks in `@renderical/core`.
4. Build `<EmptyState/>` and `<OnboardingChecklist/>`; wire `dashboard.tsx` + `home.*`.
5. Add `onboarding.tsx` + register the route; make "send a test" call `POST /api/overview/test-send` and
   toast the result (`sonner`).
6. Apply `<EmptyState/>` to the mock pages' empty branches.
7. Verify the full first-run path on a fresh user: empty dashboard → checklist → connect channel → test send
   → recent activity appears → checklist completes/dismisses.

## Acceptance criteria
- [ ] A brand-new user sees the onboarding checklist (not mock numbers); a seasoned org sees the live overview.
- [ ] `GET /api/overview` returns real, user-scoped counts; cross-user data never leaks.
- [ ] "Send a test" delivers a real notification to the current user and the dashboard's recent-activity
      updates to show it.
- [ ] Connecting a channel / sending a test auto-completes the matching checklist steps; the checklist can
      be dismissed and stays dismissed.
- [ ] Channels/logs/templates pages render a clear `<EmptyState/>` (not a blank or a mock row) when empty.

## Risks & notes
- Keep `GET /api/overview` cheap (indexed `COUNT`s over `delivery (userId,status)` and
  `notification`); if it gets heavy, back it with M33's `metric_rollup` later — keep the response shape stable.
- Derive checklist steps from real state wherever possible so the checklist can't lie (e.g. don't mark
  "channel connected" from a button click — check that a `connection` row exists).
- The `home.web.tsx`/`home.desktop.tsx` variants exist for platform differences — wire the shared overview
  data once (in `@renderical/core`) and let each variant render it, per the views/core split.
