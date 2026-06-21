# Milestone 06 — API conventions: error model, pagination & auth middleware

**Phase:** 0 · **Depends on:** M05 · **Status:** Done

## Goal
Establish the shared HTTP conventions every product endpoint reuses: a standard JSON error envelope,
a `requireAuth` middleware that guards authenticated routes, a single **list-query contract** (cursor/offset
pagination plus allow-listed server-side sorting and filtering), and a route-module pattern so each domain
lives in its own `apps/api/src/routes/<domain>.ts` mounted into the main app.

## Why it matters
Without this, every later milestone would re-invent auth checks, error shapes, and pagination — drifting
into inconsistency. Locking these now means resource milestones (M08+) are pure business logic.

## Current state
- `apps/api/src/index.ts` is a single file: CORS for `/api/auth/*`, a session middleware that sets
  `c.set('user', ...)` / `c.set('session', ...)` (or `null`), the better-auth handler, and one demo
  route.
- No error envelope, no pagination, no auth guard, no route modules yet.
- M05 added the typed Kysely client `db(env.DB)` (`AppDB`).

## Scope (in)
- **Error envelope** (`apps/api/src/lib/errors.ts`): a `{ error: { code, message, details? } }` JSON shape,
  an `ApiError` class, and an `app.onError` handler that maps `ApiError` → status + envelope and unknown
  errors → `500 internal_error`. Zod validation failures map to `422 validation_error`.
- **`requireAuth` middleware** (`apps/api/src/middleware/auth.ts`): the session is already resolved by the
  existing better-auth middleware into `c.var.session`/`c.var.user`. This guard 401s `unauthenticated`
  when `c.var.session` is null. All product routes use it.
- **List-query helpers** (`apps/api/src/lib/list-query.ts`): one composable contract for paginating,
  sorting, and filtering any user-scoped collection. **All three are enforced server-side against
  per-endpoint allow-lists** — the client never names a raw column or operator that the route did not declare.
  - **Pagination**: `limit` (default 20, cap 100, coerced int); keyset `cursor`; optional `offset`/`page`
    for small admin lists. Returns `{ data: T[], nextCursor: string | null }`.
  - **Sorting**: `sort` + `order` query params, resolved through a per-route allow-list mapping to known
    Kysely columns. Unknown `sort` key → `422`. Each route declares a default sort; cursors encode the
    active sort key plus a stable tiebreaker.
  - **Filtering**: per-field Zod schema with allow-listed operators (`eq`/`in` for enums, `gte`/`lte` for
    dates/numbers, `q` for text search). Unknown fields/operators → `422`. All filters are parameter-bound
    `WHERE` clauses AND-ed with the mandatory `userId` scope.
- **Route-module pattern**: each domain exports an `OpenAPIHono` sub-app from
  `apps/api/src/routes/<domain>.ts`; `index.ts` mounts it via `app.route('/api', domainRoutes)`.

## Out of scope (deferred)
- API-key auth → M31.
- Any concrete resource routes → their own milestones.
- Rate limiting → M30.

## Data model
None new.

## API surface
No user-facing endpoints. Defines the cross-cutting contracts:
- Error: `{ "error": { "code": "unauthenticated", "message": "..." } }` with HTTP status.
- List request: `?limit&cursor` (or `&offset`/`&page`) `&sort&order` plus per-route filter params.
- List response: `{ "data": [...], "nextCursor": "opaque|null" }`.

## Frontend
None directly.

## Implementation steps
1. Create `apps/api/src/lib/errors.ts` with `ApiError` and helper constructors
   (`unauthenticated`, `forbidden`, `notFound`, `badRequest`, `validationError`, `internal`).
2. Register `app.onError(...)` in `apps/api/src/index.ts`.
3. Create `apps/api/src/middleware/auth.ts` exporting `requireAuth`.
4. Create `apps/api/src/lib/list-query.ts` with the pagination/sort/filter helpers.
5. Create `apps/api/src/routes/_template.ts` as a documented example route module.
6. Refactor `index.ts` so mounting domain modules is one line each.

## Acceptance criteria
- [x] Hitting any `requireAuth` route without a session returns `401 { error: { code: "unauthenticated" } }`.
- [x] An invalid request body returns `422 validation_error` in the envelope shape.
- [x] A list endpoint returns `{ data, nextCursor }`, paginates correctly, `limit` capped at 100.
- [x] Unknown `sort` key returns `422`, not a 500/SQL error.
- [x] An unknown filter field or operator returns `422`.
- [x] A tampered/garbage `cursor` returns `422`.
- [x] `pnpm typecheck` passes.

## Risks & notes
- **Sorting/filtering is an injection surface** — always resolve a client-supplied key through the route's
  allow-list; never build SQL from raw input. Values go through Kysely binds.
- Every filter and sort must compose on top of the mandatory `userId` scope.
- Every resource milestone from M08 onward assumes `requireAuth`, the error envelope, the list-query
  contract, and the route-module pattern exist.
