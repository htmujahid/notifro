# Milestone 33 — Analytics dashboards

**Phase:** 9 · **Depends on:** M22 · **Status:** Done

## Goal
Turn the delivery data the pipeline already records into a real Analytics page: headline counts and rates,
a timeseries, and per-channel and per-topic breakdowns — all user-scoped and time-range filterable.

## Why it matters
Operators need to see whether sends are landing, opening, and converting. M22 captures the receipts; this
milestone surfaces them as the metrics that drive channel and content decisions.

## Current state
- M10 records `notification` + `delivery`; M22 added open/click/bounce receipts on `delivery`.
- `packages/views/src/pages/analytics.tsx` was mock-only with hardcoded numbers.
- No aggregation endpoints existed.

## Scope (in)
- **No new tables** — all queries read from `notification`, `delivery`, and `api_request_log`.
- **Summary**: sent / delivered / opened / clicked / bounced counts plus delivery/open/click **rates**.
- **Timeseries**: grouped by granularity (`hour` / `day` / `week`) over the selected range.
- **Channel breakdown**: per-channel counts + delivery rate.
- **Topic breakdown**: top topics by volume + delivery rate.
- **Time-range filter**: `from`/`to` query params, defaulting to the last 30 days.

## Data model
None. Aggregations run as Kysely/SQL `GROUP BY` queries over existing delivery rows, scoped to `userId`.

## API surface
`requireAuth`, user-scoped (`apps/api/src/routes/analytics.ts`):
- `GET /api/analytics/summary` — counts + rates
- `GET /api/analytics/timeseries` — `{data:[{period, sent, delivered, opened, clicked}]}` by granularity
- `GET /api/analytics/channels` — per-channel breakdown
- `GET /api/analytics/top-topics` — top topics by volume
All accept `from`/`to` (and timeseries accepts a granularity).

## Frontend
- `packages/views/src/pages/analytics.tsx` — summary cards, timeseries chart, channel breakdown table,
  topic breakdown table, range selector.
- `packages/core/src/hooks/analytics.ts` — `useAnalyticsSummary`, `useAnalyticsTimeseries`,
  `useAnalyticsChannels`, `useAnalyticsTopTopics`.
- Analytics nav item in `app-sidebar.tsx`.
- Types `AnalyticsSummary`, `AnalyticsTimeseriesItem`, `AnalyticsChannelRow`, `AnalyticsTopicRow` in
  `packages/api-client/src/types.ts`.

## Implementation steps
1. Write the aggregation queries in `apps/api/src/routes/analytics.ts` (all `.where('userId', '=', userId)`).
2. Add the four endpoints with `from`/`to` (+ granularity) params.
3. Wire `analytics.tsx` to live hooks; replace mock data with the summary/timeseries/breakdown views.

## Acceptance criteria
- [x] The summary returns correct user-scoped counts and rates for the selected range.
- [x] The timeseries groups by hour/day/week and renders a chart.
- [x] Channel and topic breakdowns reflect real delivery rows.
- [x] All endpoints are user-scoped; no cross-user data leaks.

## Risks & notes
- Rates are computed from the delivery counts in the same range; a partial window shows partial rates.
- Cost tracking is not modeled (no per-provider price table) — counts only.
