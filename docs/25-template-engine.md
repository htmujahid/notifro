# Milestone 25 — Template engine (variables, conditionals, loops, localization)

**Phase:** 6 · **Depends on:** M09 · **Status:** Done

## Goal
Add reusable, user-scoped **templates** plus a render engine that turns a template + a data context
into a concrete unified-compose payload — supporting variables (`{{user.name}}`), conditionals,
loops, and per-locale strings — and slot that render step into the compose → per-channel transform
pipeline so a notification can say "render template X with data Y" instead of carrying inline content.

## Why it matters
Teams author a message once and reuse it across thousands of sends with different recipient data and
languages. Without server-side templating, every caller hand-builds payloads and localization is
impossible. This is the content backbone for the visual builder (M26), preferences (M28),
and journeys (M35).

## Current state
- The unified compose schema and the channel transform contract exist from **M09** — a normalized
  payload (text/markdown/buttons/images/blocks) that each channel adapter (M10–M11, M13–M15) transforms.
- A send creates one `notification` row → many `delivery` rows (**M10** pipeline).
- `packages/views/src/pages/templates.tsx` is a **mock-only** page (hardcoded data, local `useState`,
  no API). It is wired for real in **M26**, not here.
- `@workspace/i18n` is a **placeholder** (README only, no `package.json`) — this milestone gives it its
  first concrete job (locale resolution + ICU-style formatting helpers).
- DB access is the typed Kysely client `db(env.DB)` over D1 (**M05**); routes use `requireAuth` + user-scope conventions (**M06**).

## Scope (in)
- `template` table (user-scoped): name, slug, description, default locale, and a JSON `content` column
  holding **per-channel content blocks** keyed off the M09 compose schema (e.g. `{ default: {...},
  email: {...}, slack: {...} }`) where string fields may contain template expressions.
- A pure render engine `@workspace/templating` (new package, server-usable): `render(template, ctx,
  { locale })` → resolved unified-compose payload. Supports:
  - **Variables** — `{{path.to.value}}` with safe lookups and default filters (`{{user.name | "there"}}`).
  - **Conditionals** — `{{#if cond}}…{{else}}…{{/if}}`.
  - **Loops** — `{{#each items as item}}…{{/each}}`.
  - **Localization** — locale-keyed string tables resolved via `@workspace/i18n` with fallback to the
    template's default locale, then to the raw key.
  - **Escaping** — channel-aware escaping is delegated to the M09 transforms; the engine emits the
    normalized payload, never channel-final markup.
- Send-time integration: extend the send request (M10) to accept `{ templateId | templateSlug, data,
  locale? }` as an alternative to an inline `message`. Resolve → render → hand the resulting compose
  payload to the existing pipeline.
- Server-side **validation/lint**: detect unknown variables against a declared `variables` schema on
  the template, and reject renders with missing required variables (configurable strict/loose).

## Out of scope (deferred)
- Visual builder, live preview UI, versioning/rollback, snippets, brand kit → **M26**.
- A/B variants of a template → deferred (not built; A/B testing is out of scope).
- AI-assisted drafting/tone → **deferred (not built)**.

## Data model
Wrangler D1 SQL migration:
```sql
-- apps/api/migrations/NNNN_template_schema.sql
CREATE TABLE "template" (
  "id" text not null primary key,
  "userId" text not null references "organization"("id") on delete cascade,
  "name" text not null,
  "slug" text not null,               -- unique per org; referenced by sends
  "description" text,
  "defaultLocale" text not null default 'en',
  "content" text not null,            -- JSON: per-channel content blocks (M09 shape); strings may hold {{expressions}}
  "variables" text,                   -- JSON: [{ key, type, required }] for lint/validation
  "localeStrings" text,               -- JSON: { en: {greeting:"Hi"}, fr: {greeting:"Bonjour"} }
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "template_org_slug_idx" ON "template" ("userId", "slug");
```
Kysely interface (add to the `DB` interface from M05):
```ts
// apps/api/src/db/schema.ts
export interface TemplateTable {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  defaultLocale: string
  content: string            // JSON string (per-channel M09 blocks)
  variables: string | null   // JSON string
  localeStrings: string | null // JSON string
  createdAt: string
  updatedAt: string
}
// add `template: TemplateTable` to the DB interface
```
Index note (M06 list contract): add `(userId, updatedAt, id)` to back the `GET /api/templates`
default keyset list/sort, plus indexes on `name` and `createdAt` for those sortable keys; the existing
`template_org_slug_idx` already covers slug lookups.

## API surface
All routes user-scoped, `requireAuth` (M06).
- `GET    /api/templates` — list (paginated).
  - **List query (M06 contract):** default sort `updatedAt desc`; keyset cursor on `(updatedAt, id)`.
    - Sortable allow-list: `name` → `name`, `updatedAt` → `updatedAt`, `createdAt` → `createdAt`.
    - Filterable allow-list (from the M25 model): `q` (free-text on `name`/`slug`/`description`),
      `defaultLocale` (eq). (A `status` draft/published or per-channel filter is **not** in the M25
      `template` model — adding it would require a new column; deferred.)
    - AND-ed with the mandatory `userId` scope; unknown sort/filter key or operator → `422`;
      malformed cursor → `422`.
- `POST   /api/templates` — create.
- `GET    /api/templates/:id` — fetch one.
- `PATCH  /api/templates/:id` — update.
- `DELETE /api/templates/:id` — delete.
- `POST   /api/templates/:id/render` — body `{ data, locale? }` → returns the resolved unified-compose
  payload (used by previews in M26 and for debugging). Does **not** send.
- Send route (M10) extended: `POST /api/notifications` accepts `{ templateId|templateSlug, data, locale? }`.

## Frontend
None in this milestone (engine + API only). The Templates page is wired in **M26**. Optionally expose a
`renderTemplate(id, data)` helper in the M07 api-client so M26 can build on it.

## Implementation steps
1. Create `packages/templating` (`@workspace/templating`): pure TS, no Cloudflare deps so it runs in the
   Worker and in tests. Implement the parser/evaluator for variables, `#if`, `#each`, and the `| default`
   filter. Keep it allow-list/safe — no arbitrary code eval.
2. Add locale resolution: accept `localeStrings` + requested locale; fall back default → key. Pull any
   shared formatting (dates/numbers) from `@workspace/i18n` (give that package its first real export).
3. Add a wrangler D1 migration in `apps/api/migrations/` for the `template` table (apply:
   `wrangler d1 migrations apply DB --local`) and add `TemplateTable` to the Kysely `DB` interface (per M05).
4. Build `apps/api/src/routes/templates.ts` using `@hono/zod-openapi` + `requireAuth`; mount it
   in `apps/api/src/index.ts`. Implement CRUD + `/render`.
5. Implement `renderTemplate(template, data, locale)` server helper that: validates `data` against
   `template.variables`, runs `@workspace/templating` over each channel block, and returns an M09 compose
   payload. Reuse it from both `/render` and the send path.
6. Extend the M10 send handler to branch on `templateId|templateSlug`: load template → `renderTemplate`
   → existing compose→transform→delivery pipeline. Persist `templateId` + `data` on the `notification`
   row for audit/replay.
7. Add the `renderTemplate` method to `@workspace/api-client` (M07) for downstream UIs.
8. Unit-test the engine: variables, nested paths, missing-required, `#if`/`#each`, locale fallback,
   and an end-to-end render → email/Slack transform.

## Acceptance criteria
- [x] `@workspace/templating` renders variables, `#if`, `#each`, and `| default`, with unit tests passing.
- [x] A template with `localeStrings` renders the right language for a requested locale and falls back to
      the default locale, then the raw key, when missing.
- [x] `POST /api/templates` + `POST /api/templates/:id/render` round-trip: create a template, render with
      sample data, get a valid M09 compose payload.
- [x] `POST /api/notifications` with `{ templateSlug, data }` produces the same deliveries as the
      equivalent inline `message`, and stores `templateId`+`data` on the notification.
- [x] Rendering with a missing **required** variable is rejected with a clear validation error.
- [x] All template routes are user-scoped (`requireAuth`); cross-user template access is impossible.
- [x] `GET /api/templates` returns `{ data, nextCursor }`, defaults to `updatedAt desc`, supports the
      `name`/`createdAt` sort keys and `q`/`defaultLocale` filters within user scope, and rejects an unknown
      sort/filter key or a tampered cursor with `422` (M06 contract).

## Risks & notes
- **Security**: the engine must never evaluate arbitrary code — use a closed expression grammar and
  safe property lookups; cap loop iterations and output size to avoid runaway sends.
- Keep the engine **channel-agnostic**: it emits the normalized M09 payload; channel-final escaping
  (HTML email, Slack mrkdwn) stays in the M09/M10–M11, M13–M15 transforms to avoid double-escaping.
- Persisting `data` on the notification enables M34 replay/inspection.
- `localeStrings` here is template-local; a future org-wide shared catalog can live in `@workspace/i18n`.
