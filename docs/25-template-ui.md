# Milestone 25 — Template management UI: builder, versioning/rollback, snippets, brand kit

**Phase:** 6 · **Depends on:** M24 · **Status:** Done

## Goal
Make `templates.tsx` real: a visual template builder with **live multi-channel preview**, full template
CRUD wired to the M24 API, template **versioning with rollback**, a shared **snippet/component library**,
and an org **brand kit** (logo, colors, fonts) that the channel transforms apply automatically.

## Why it matters
Authoring is where non-engineers live. A compose-once payload only pays off if a marketer can edit a
template, see exactly how it lands in email vs. Slack, save a version, and roll back a bad edit — without
touching code. The brand kit guarantees consistent branding across every channel from one place.

## Current state
- **M24** shipped the `template` table, the `@renderical/templating` render engine, template CRUD routes,
  and `POST /api/templates/:id/render` (render-without-send) plus an `@renderical/api-client` helper.
- **M09** transforms turn a unified-compose payload into channel-final output (email HTML, Slack Block
  Kit, etc.) — these power the per-channel preview here.
- `packages/views/src/pages/templates.tsx` is still the **mock** page (hardcoded list, local `useState`).
- Routing pattern: pages live in `packages/views/src/pages`, are registered in
  `packages/views/src/routes/_shared.tsx` (`sharedProtectedChildren` already contains `templates`),
  state/hooks live in `@renderical/core`, UI uses `@renderical/ui` (tabs, card, dialog, button, input,
  resizable panels, code/preview surfaces).

## Scope (in)
- **CRUD wiring**: replace the mock data in `templates.tsx` with real list/create/edit/delete via
  `@renderical/core` hooks calling the M24 endpoints through `@renderical/api-client`.
- **Visual builder**: an editor view (`/templates/:id`) with the M09 content blocks (text, markdown,
  buttons, images) editable per channel, plus a raw/expression mode for `{{variables}}`.
- **Live multi-channel preview**: a side panel that calls `POST /api/templates/:id/render` with sample
  data and renders each channel's transformed output (email/Slack/Discord/etc.) in switchable tabs,
  using `@renderical/ui` resizable panels.
- **Versioning + rollback**: every save creates a `template_version` snapshot; a version history drawer
  lets the user diff and **restore** a prior version (restore = new version equal to the old content).
- **Snippet library**: user-scoped reusable content fragments (`snippet` table) insertable into any
  template; editing a snippet does **not** retroactively change saved template versions (snapshot at use).
- **Brand kit**: one `brand_kit` per org (logo URL, color tokens, font stack) edited in settings; the
  M09/M10–M11, M13–M15 transforms read it so branding is applied at render/transform time across channels.

## Out of scope (deferred)
- The render engine internals → **M24**.
- A/B variant management → deferred (not built; A/B testing is out of scope).
- AI drafting / tone adjustment in the editor → **deferred (not built)**.
- Send-time digest templating → **out of scope (digests not built)**.

## Data model
Wrangler D1 SQL migration (extends M24):
```sql
-- apps/api/migrations/NNNN_template_ui_schema.sql
CREATE TABLE "template_version" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "templateId" text not null references "template"("id") on delete cascade,
  "version" integer not null,            -- monotonic per template
  "content" text not null,               -- JSON
  "localeStrings" text,                  -- JSON
  "variables" text,                      -- JSON
  "createdBy" text references "user"("id"),
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "template_version_idx" ON "template_version" ("templateId", "version");
-- M06 list contract: "template_version_idx" backs the GET /api/templates/:id/versions default sort
-- (version desc, scoped by templateId); add an index covering "createdAt" / "createdBy" for those keys.

CREATE TABLE "snippet" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "content" text not null,               -- JSON: M09 block fragment
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE "brand_kit" (
  "id" text not null primary key,
  "userId" text not null unique references "user"("id") on delete cascade,
  "logoUrl" text,
  "colors" text,                         -- JSON: { primary, bg, text, ... }
  "fontStack" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
```
Kysely interfaces (add each to the `DB` interface from M05):
```ts
// apps/api/src/db/schema.ts
export interface TemplateVersionTable {
  id: string; userId: string; templateId: string; version: number
  content: string; localeStrings: string | null; variables: string | null
  createdBy: string | null; createdAt: string; updatedAt: string
}
export interface SnippetTable {
  id: string; userId: string; name: string; content: string; createdAt: string; updatedAt: string
}
export interface BrandKitTable {
  id: string; userId: string; logoUrl: string | null; colors: string | null
  fontStack: string | null; createdAt: string; updatedAt: string
}
// add `template_version: TemplateVersionTable; snippet: SnippetTable; brand_kit: BrandKitTable`
```
On `PATCH /api/templates/:id`, also write a new `template_version` snapshot (current content → version+1).

## API surface
All routes: `requireAuth`, user-scoped (M06).
- `GET    /api/templates/:id/versions` — list version history.
  - **List query (M06 contract):** default sort `version desc` (newest first); keyset cursor on
    `(version, id)` (`version` is monotonic per template, so it is its own stable order).
    - Sortable allow-list: `version` → `version`, `createdAt` → `createdAt`.
    - Filterable allow-list: `createdBy` (eq, user id).
    - AND-ed with the mandatory `userId` scope and the path `templateId`; unknown sort/filter key
      or operator → `422`; malformed cursor → `422`.
- `POST   /api/templates/:id/versions/:version/restore` — restore (creates a new top version).
- `GET/POST/PATCH/DELETE /api/snippets` — snippet CRUD.
- `GET    /api/brand-kit` · `PUT /api/brand-kit` — read/update the org brand kit.
- (Reuses M24 `GET/POST/PATCH/DELETE /api/templates` and `POST /api/templates/:id/render`.)

## Frontend
- `packages/views/src/pages/templates.tsx` — list view wired to real data (replace mock array).
- `packages/views/src/pages/template-edit.tsx` — new builder page; register `templates/:id` under
  `sharedProtectedChildren` in `packages/views/src/routes/_shared.tsx`.
- `packages/core/src/hooks/templates.ts` — `useTemplates`, `useTemplate`, `useCreate/Update/DeleteTemplate`,
  `useRenderPreview`, `useTemplateVersions`, `useRestoreVersion`, `useSnippets`, `useBrandKit` (TanStack
  Query + the M07 api-client).
- `packages/core/src/components/templates/*` — builder editor, preview panel, version-history drawer,
  snippet picker, brand-kit form. Compose from `@renderical/ui` primitives only.
- Brand-kit editor surfaced in the existing `settings.tsx` page (new section).

## Implementation steps
1. Add a wrangler D1 migration for `template_version`, `snippet`, `brand_kit` (apply:
   `wrangler d1 migrations apply DB --local`) and add their Kysely interfaces to the `DB` type (per M05).
2. Add the versions/snippets/brand-kit routes; on every template update, snapshot a version.
3. Update the M09/M10–M11, M13–M15 transforms to accept an optional resolved brand kit and apply logo/colors/fonts.
4. Add the `@renderical/core` template hooks; build the builder, preview, history, snippet, brand-kit
   components from `@renderical/ui`.
5. Wire `templates.tsx` to the list hooks; add `template-edit.tsx` and register the `templates/:id` route.
6. Implement live preview: debounce edits → `useRenderPreview` → render channel tabs.
7. Verify across web and (smoke) desktop, since both render `@renderical/views`.

## Acceptance criteria
- [x] Templates list, create, edit, and delete work against the real API (no mock data remains in
      `templates.tsx`).
- [x] Editing content updates the live preview, and switching channel tabs shows correctly transformed
      output (email HTML vs. Slack blocks vs. others) for the same source payload.
- [x] Saving creates a new version; the history drawer lists versions and **restore** brings back prior
      content as a new top version.
- [x] Snippets can be created and inserted into a template; a later snippet edit does not alter previously
      saved template versions.
- [x] The brand kit is editable in settings and visibly applied (logo/colors/fonts) in at least the email
      and one chat-channel preview.
- [x] All new routes are user-scoped (`requireAuth`).
- [x] `GET /api/templates/:id/versions` returns `{ data, nextCursor }`, defaults to `version desc`,
      supports the `createdAt` sort and `createdBy` filter within org + `templateId` scope, and rejects an
      unknown sort/filter key or a tampered cursor with `422` (M06 contract).

## Risks & notes
- **Preview fidelity**: preview must use the exact M09 transforms the send path uses — render server-side
  via `/render` + transforms rather than re-implementing rendering in the browser, to avoid drift.
- **Version growth**: snapshot on save can accumulate; consider pruning/retention later (note for M34/ops).
- Snippet "snapshot at use" keeps versions immutable — do not store live snippet references inside saved
  template content.
- Brand kit is read at transform time, so changing it re-brands future sends without editing templates.
