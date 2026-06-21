# Milestone 07 — Typed API client (`@workspace/api-client`) & TanStack Query hook conventions

**Phase:** 0 · **Depends on:** M06 · **Status:** Done

## Goal
Create a new shared package `@workspace/api-client` that wraps `fetch` against the Hono API (cookie auth,
typed responses, error-envelope mapping) and establish the TanStack Query hook convention every later
milestone uses to wire a mock page to real data.

## Why it matters
Today the only client→server path is the better-auth client; the product pages render hardcoded data.
Every milestone from M10 onward needs a consistent, typed way to call non-auth endpoints.

## Current state
- `apps/web/src/App.tsx` reads `VITE_API_URL` and builds the auth client with `createWebAuthClient`.
- TanStack Query is already configured (`packages/app/src/app/query.tsx`, `staleTime: 60s`, `retry: 1`).
- M06 defined the error envelope `{ error: { code, message, details? } }` and list shape `{ data, nextCursor }`.

## Scope (in)
- New package `packages/api-client` (`@workspace/api-client`) with:
  - `src/client.ts` — `createApiClient(baseURL)` returning typed `get`/`post`/`patch`/`delete` helpers that
    send `credentials: 'include'`, set `Content-Type: application/json`, parse JSON, and on non-2xx throw a
    typed `ApiClientError` carrying the parsed `{ code, message, details }` from the M06 envelope.
  - `src/error.ts` — `ApiClientError` class + `isApiError(e, code?)` guard.
  - `src/types.ts` — shared request/response types.
  - `src/context.tsx` — React context + `useApiClient()` hook.
- Wire the provider into `AppProvider` (`packages/app/src/app/context.tsx`).
- Document the **hook convention**: a `<resource>Keys` query-key factory, `use<Resource>List(params)` /
  `use<Resource>(id)` (`useQuery`) and `useCreate<Resource>()` etc. (`useMutation`). These hooks live in
  `@workspace/core/hooks/<resource>.ts`.
- **List-hook convention**: `use<Resource>List` takes typed `{ sort?, order?, filters?, limit? }` and passes
  those params into the query key; cursor-paginated lists use `useInfiniteQuery`.

## Out of scope (deferred)
- Concrete resource hooks (notifications, channels…) → their own milestones.
- API-key / bearer auth → M31.

## Data model
None.

## API surface
None new. Consumes M06's envelope + list conventions.

## Frontend
- `packages/api-client/*` (new package).
- `packages/app/src/app/context.tsx` — mount the API-client provider.
- `packages/core/src/hooks/connections.ts` as the reference hook (query-key factory + `useQuery`).

## Implementation steps
1. Scaffold `packages/api-client` mirroring an existing leaf package structure.
2. Implement `src/error.ts`, `src/client.ts`, `src/context.tsx`.
3. Update `packages/app/src/app/context.tsx` to render `ApiClientProvider`.
4. Add `@workspace/api-client` to `packages/core` deps; add `packages/core/src/hooks/connections.ts`
   as the reference hook calling `useApiClient().get('/api/connections')`.

## Acceptance criteria
- [x] `@workspace/api-client` builds and typechecks.
- [x] `useApiClient()` returns a configured client inside any app wrapped by `AppProvider`.
- [x] A non-2xx API response surfaces as `ApiClientError` with the server's `code`/`message`.
- [x] The reference connections hook renders live data in the web app.

## Risks & notes
- Keep `credentials: 'include'` — auth is cookie-based and CORS must allow credentials for `/api/*`.
- This client is for product endpoints only; auth stays in `@workspace/app`.
