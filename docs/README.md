# Renderical — Build Reference

This folder is the **single source of truth** for what the platform does and how it's wired. Each file
describes one milestone — its data model, API surface, frontend, and acceptance criteria — as built. All
milestones are **Done**; these are reference docs for future changes, not a build queue.

> To change or extend a feature, read its milestone file first: it cites the exact tables, routes, hooks,
> and files involved.

---

## Architecture (locked — do not deviate)

- **Auth**: `requireAuth` middleware on all product routes. No `requireOrg`, no RBAC roles, no
  `organization` plugin. better-auth sessions and API-key auth (M03/M04) resolve to a single user.
- **Scope**: single-user. Every product table has a `userId TEXT NOT NULL REFERENCES "user"("id") ON DELETE
  CASCADE` column. All queries add `.where('userId', '=', userId)` where `userId = c.var.user!.id`.
- **Database**: Kysely over Cloudflare D1 (SQLite). Schema in `apps/api/src/db/schema.ts`. Migrations in
  `apps/api/migrations/` via wrangler (`wrangler d1 migrations apply DB --local`). Never use `db.prepare()`
  strings.
- **Queue**: Cloudflare Queues (`DELIVERY_Q`) for delivery fan-out. Consumer in
  `apps/api/src/queue/consumer.ts`.
- **Cron**: Cloudflare Workers cron triggers. Sweep handler in `apps/api/src/scheduling/sweep.ts` (advances
  due scheduled sends, recurring sends, and journey runs).
- **Frontend packages**: `@workspace/views` (pages/routes), `@workspace/core` (hooks/components/layouts),
  `@workspace/api-client` (typed client + shared types). UI from `@workspace/ui` (shadcn-generated — never
  edit `packages/ui/src/components/`).
- **Channels**: 11 registered adapters in `apps/api/src/channels/` (`email | webhook | web_push | sms |
  whatsapp | telegram | slack | discord | teams | mobile_push | in_app`), self-registering via `index.ts`
  imports.
- **API conventions**: `@hono/zod-openapi` routes with `defaultHook: validationHook`; `Errors.*` helpers;
  `listQuerySchema`/`applyListQuery` for list endpoints (`{data, nextCursor}`, keyset cursor, limit cap 100,
  allow-listed sort/filter, unknown key → 422).

## Key patterns

- **No code comments.** Self-explanatory code only.
- **Migrations**: one numbered `.sql` file per schema change in `apps/api/migrations/`; add the matching
  Kysely interface to the `DB` type.
- **Hooks**: TanStack Query (`useInfiniteQuery`/`useQuery` + `useMutation`) in `packages/core/src/hooks/`;
  each export path added to `packages/core/package.json`.
- **Types**: shared interfaces in `packages/api-client/src/types.ts`.
- **Routes**: `OpenAPIHono<AppEnv>`; mount in `apps/api/src/index.ts` under `/api`.

---

## Milestone index

| M  | Title                                              | Phase | Depends on            | Status |
|----|----------------------------------------------------|-------|-----------------------|--------|
| 00 | Monorepo scaffold, shared packages & client apps   | 00    | —                     | Done   |
| 01 | Cloudflare Worker + Hono/zod-openapi API scaffold  | 00    | M00                   | Done   |
| 02 | Mailer (CF Email binding + transactional templates)| 00    | M01                   | Done   |
| 03 | Authentication (better-auth core, Google, sessions)| 00    | M01, M02              | Done   |
| 04 | Two-factor, phone OTP & API-key auth               | 00    | M03                   | Done   |
| 05 | Data layer (Kysely over D1, user-scoped)           | 0     | M03                   | Done   |
| 06 | API conventions: errors, pagination, `requireAuth` | 0     | M05                   | Done   |
| 07 | Typed API client (`@workspace/api-client`)         | 0     | M06                   | Done   |
| 08 | Channel registry & connection storage              | 1     | M05, M06              | Done   |
| 09 | Unified compose schema & transform contract        | 1     | M08                   | Done   |
| 10 | Email channel (CF Email binding) + delivery        | 1     | M08, M09              | Done   |
| 11 | In-app inbox + Notifications page                   | 1     | M10                   | Done   |
| 12 | Onboarding wizard + dashboard home                 | 2     | M08, M10, M11         | Done   |
| 13 | Web push (VAPID)                                    | 3     | M08, M09, M10         | Done   |
| 14 | Generic webhook channel (HMAC)                     | 3     | M08, M09, M10         | Done   |
| 15 | SMS channel (Twilio)                               | 3     | M08, M09, M10         | Done   |
| 16 | WhatsApp channel (Twilio)                          | 3     | M15                   | Done   |
| 17 | Telegram channel (Bot API)                         | 3     | M08, M09, M10         | Done   |
| 18 | Slack channel (bot token + Block Kit)              | 3     | M08, M09, M10         | Done   |
| 19 | Discord & Teams channels (webhook URLs)            | 3     | M08, M09, M10, M14    | Done   |
| 20 | Mobile push (APNs / FCM)                           | 3     | M08, M09, M10         | Done   |
| 21 | Delivery queue: retries, backoff, DLQ, idempotency | 4     | M10                   | Done   |
| 22 | Delivery receipts, open/click, bounce              | 4     | M21                   | Done   |
| 23 | Scheduling, timezones, quiet hours                 | 5     | M21                   | Done   |
| 24 | Recurring/cron sends                               | 5     | M23                   | Done   |
| 25 | Template engine (vars, conditionals, loops, i18n)  | 6     | M09                   | Done   |
| 26 | Template management UI (builder, versioning)       | 6     | M25                   | Done   |
| 27 | Audiences, segmentation & personalization          | 6     | M09, M25, M10         | Done   |
| 28 | Preference center, topics, unsubscribe             | 7     | M10, M11              | Done   |
| 29 | Routing rules & fallback chains                    | 7     | M28, M05–M07          | Done   |
| 30 | KV-backed rate limiting                            | 7     | M21, M05–M07          | Done   |
| 31 | Developer tools: API keys, SDK, CLI                | 8     | M10, M06              | Done   |
| 32 | MCP server (remote HTTP + local stdio)             | 8     | M10, M28, M31         | Done   |
| 33 | Analytics dashboards                               | 9     | M22                   | Done   |
| 34 | Audit log, suppression & consent ledger            | 9     | M22, M28              | Done   |
| 35 | Workflows & multi-step journeys                    | 10    | M23, M29, M30         | Done   |
| 36 | Provider failover & health checks                  | 10    | M21, M29              | Done   |

## Phase map

- **Phase 00 — Platform foundation**: 00–04 (monorepo + clients, Worker/API scaffold, mailer, auth, 2FA/API keys)
- **Phase 0 — Foundations**: 05–07 (data layer, API conventions, typed client)
- **Phase 1 — Core send loop**: 08–11 (channels, compose, email, inbox)
- **Phase 2 — Activation**: 12 (onboarding + dashboard)
- **Phase 3 — Channels**: 13–20 (web push, webhook, SMS, WhatsApp, Telegram, Slack, Discord/Teams, mobile push)
- **Phase 4 — Reliability**: 21–22 (queue, receipts)
- **Phase 5 — Scheduling**: 23–24 (scheduling, recurring)
- **Phase 6 — Templates & targeting**: 25–27 (engine, UI, audiences/segmentation)
- **Phase 7 — Preferences & control**: 28–30 (preference center, routing, rate limiting)
- **Phase 8 — Developer platform**: 31–32 (API keys/SDK/CLI, MCP)
- **Phase 9 — Observability**: 33–34 (analytics, audit/compliance)
- **Phase 10 — Orchestration & ops**: 35–36 (journeys, failover/health)

## Milestone file template

```md
# Milestone NN — <Title>

**Phase:** <n> · **Depends on:** M<nn>, M<nn> · **Status:** Done

## Goal           — what is true after this milestone
## Why it matters — the product value
## Current state  — what it builds on (file paths)
## Scope (in)     — concrete, checkable items
## Data model     — tables/columns/indexes: migration + Kysely DB entry
## API surface    — endpoints: method, path, request/response, auth/scope
## Frontend       — pages/components/hooks (file paths)
## Implementation steps — numbered, in build order, with file paths
## Acceptance criteria  — checklist a reviewer can verify
## Risks & notes  — edge cases, perf, security, downstream dependencies
```
