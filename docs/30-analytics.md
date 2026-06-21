# Milestone 30 — Analytics dashboards

**Phase:** 9 · **Depends on:** M22 · **Status:** Done

## Goal
Turn the delivery data the pipeline already records into a real Analytics page: headline delivery counts
and rates, a timeseries, and a per-channel breakdown — all user-scoped and time-range filterable.

## Why it matters
You need to see whether sends are actually landing. M22 captures the receipts; this milestone surfaces
them as the delivery metrics that drive channel decisions.

## Current state
- M10 records `notification` + `delivery`; M22 added bounce receipts on `delivery`.
- `packages/views/src/pages/analytics.tsx` was mock-only with hardcoded numbers.
- No aggregation endpoints existed.

## Scope (in)
- **No new tables** — all queries read from `notification` and `delivery`.
- **Summary**: sent / delivered counts plus delivery rate.
- **Timeseries**: grouped by granularity (`hour` / `day` / `week`) over the selected range.
- **Channel breakdown**: per-channel sent / delivered counts + delivery rate.
- **Time-range filter**: `from`/`to` query params, defaulting to the last 30 days.

## Data model
None. Aggregations run as Kysely/SQL `GROUP BY` queries over existing delivery rows, scoped to `userId`.

## API surface
`requireAuth`, user-scoped (`apps/api/src/routes/analytics.ts`):
- `GET /api/analytics/summary` — sent / delivered counts + delivery rate
- `GET /api/analytics/timeseries` — `{data:[{period, sent, delivered}]}` by granularity
- `GET /api/analytics/channels` — per-channel breakdown
All accept `from`/`to` (and timeseries accepts a granularity).

## Frontend
- `packages/views/src/pages/analytics.tsx` — summary cards, timeseries chart, channel breakdown table,
  range selector.
- `packages/core/src/hooks/analytics.ts` — `useAnalyticsSummary`, `useAnalyticsTimeseries`,
  `useAnalyticsChannels`.
- Analytics nav item in `app-sidebar.tsx`.
- Types `AnalyticsSummary`, `AnalyticsTimeseriesItem`, `AnalyticsChannelRow` in
  `packages/api-client/src/types.ts`.

## Implementation steps
1. Write the aggregation queries in `apps/api/src/routes/analytics.ts` (all `.where('userId', '=', userId)`).
2. Add the three endpoints with `from`/`to` (+ granularity) params.
3. Wire `analytics.tsx` to live hooks; replace mock data with the summary/timeseries/breakdown views.

## Acceptance criteria
- [x] The summary returns correct user-scoped sent/delivered counts and delivery rate for the selected range.
- [x] The timeseries groups by hour/day/week and renders a chart.
- [x] Channel breakdown reflects real delivery rows.
- [x] All endpoints are user-scoped; no cross-user data leaks.

## Risks & notes
- Rates are computed from the delivery counts in the same range; a partial window shows partial rates.
- Cost tracking is not modeled (no per-provider price table) — counts only.
