# Milestone 01 — Cloudflare Worker + Hono/zod-openapi API scaffold

**Phase:** 00 (Foundation) · **Depends on:** M00 · **Status:** Done

## Goal
Stand up the `apps/api` Cloudflare Worker: Hono via `@hono/zod-openapi`, all runtime bindings (D1, two KV
namespaces, Queues + DLQ, Email, cron), self-documenting OpenAPI at `/doc` + Scalar UI at `/scalar`, and the
three Worker entrypoints (fetch handler, queue consumer, scheduled sweep).

## Why it matters
This is the single backend every channel, route, and client talks to. Establishing the bindings, the OpenAPI
conventions, and the queue/cron entrypoints up front means every later milestone just adds a router or a
consumer branch rather than re-plumbing infrastructure.

## Current state
- M00 provides the monorepo + `@renderical/api-client` (the typed client that consumes this Worker's `/doc`).
- No backend exists yet.

## Scope (in)
- **Worker config** (`apps/api/wrangler.jsonc`): `compatibility_flags: ["nodejs_compat"]`; bindings:
  - `DB` — D1 database `renderical`, `migrations_dir: migrations`
  - `KV` — better-auth secondary storage (sessions, rate-limit counters)
  - `RATE_LIMIT_KV` — app-level rate limiting (M30)
  - `EMAIL` — Cloudflare `send_email` binding (M02)
  - `DELIVERY_Q` producer + a `delivery-queue` consumer (`max_retries: 5`, DLQ `delivery-dlq`) + a
    `delivery-dlq` consumer (M21)
  - cron trigger `* * * * *` → scheduled sweep (M23+)
- **Hono + OpenAPI**: `OpenAPIHono<AppEnv>` app in `src/index.ts`; OpenAPI schema at `/doc`, Scalar API
  reference at `/scalar`.
- **Worker entrypoints**: default export with `fetch` (Hono), `queue` (delivery consumer, M21), and
  `scheduled` (sweep, M23) handlers.
- **Cross-cutting middleware**: CORS (credentials + custom headers), per-request DB client on `c.var.db`,
  auth/session population (M03), and the request placeholder for later logging (M31).
- **Type generation**: `wrangler types` → `worker-configuration.d.ts` (`CloudflareBindings`); `AppEnv`
  context type in `src/lib/types.ts`.

## API surface
- `GET /doc` — OpenAPI 3 schema.
- `GET /scalar` — Scalar API reference UI.
- `/api/*` — the mount point for every feature router (added by later milestones).
- `GET /health` — added in M36 (liveness probe).

## Implementation steps
1. `wrangler.jsonc` with all bindings; `package.json` scripts (`dev`, `deploy`, `cf-typegen`,
   `db:migrate`, `db:migrate:remote`).
2. `src/index.ts`: `OpenAPIHono<AppEnv>`, CORS, `/doc` + `/scalar`, the per-request DB middleware.
3. `src/lib/types.ts`: `AppEnv` with `Variables` (`user`, `session`, `db`, plus fields added later).
4. Wire the `queue` and `scheduled` exports (handlers filled in by M21 / M23).
5. `wrangler types` to generate `worker-configuration.d.ts`.

## Acceptance criteria
- [x] `wrangler dev` boots the Worker; `/doc` and `/scalar` serve the API reference.
- [x] D1, both KV namespaces, the Email binding, `DELIVERY_Q` + DLQ, and the cron trigger are all bound.
- [x] `@renderical/api-client` can target the Worker and call `/api/*` routes.
- [x] The `fetch` / `queue` / `scheduled` entrypoints are all exported.

## Risks & notes
- API conventions (error model, list-query contract, `requireAuth`) are formalized in M06; this milestone
  only establishes the scaffold + bindings.
- The queue consumer and scheduled sweep are wired here but only do real work from M21 / M23 onward.
