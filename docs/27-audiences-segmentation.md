# Milestone 27 — Audiences, segmentation & personalization

**Phase:** 6 · **Depends on:** M09, M25, M10 · **Status:** Done

## Goal
Introduce a first-class **recipient/contact** model with arbitrary user attributes, **audience segments** defined by attribute filters, **dynamic per-recipient content** (driven by the template engine), and automatic locale/timezone detection. Replace the mock Audiences page with real data.

## Why it matters
Targeted, personalized sends are what separate a notification platform from a fire-and-forget mailer. Segments become the unit broadcasts and journeys (M35) target.

## Current state
- `packages/views/src/pages/audiences.tsx` was mock-only — replaced with real API.
- M09 defined the unified compose schema and per-channel transform contract; M25 added the template engine — dynamic content plugs into both.
- M10's `notification`/`delivery` pipeline can already target an explicit recipient; this milestone lets it target a *segment* and resolve it to recipients.

## Scope (in)
- A **`recipient`** table (user-scoped): external id, email/phone, `locale`, `timezone`, and a JSON `attributes` bag.
- **Attribute-based `segment`** definitions: a serializable filter AST (AND/OR of attribute/operator/value clauses) plus a resolver `resolveSegment(segmentId) → recipientIds`.
- **Dynamic content**: pass a recipient's `attributes` into the M25 template render context so `{{firstName}}`, conditionals, and loops personalize per recipient.
- **Locale/timezone auto-detection**: infer `locale`/`timezone` at ingest and store on the recipient.
- Wire `audiences.tsx` to real segments + recipient counts and a recipient browser.

## Out of scope
- A/B testing of message variants — reverted; deliveries always use the notification's single payload.
- Multi-step journeys that act on segments → M35.
- Analytics dashboards → M33.

## Data model
Migration: `apps/api/migrations/0016_audiences_schema.sql`

```sql
CREATE TABLE "recipient" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "externalId" text,
  "email" text,
  "phone" text,
  "locale" text,
  "timezone" text,
  "attributes" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "recipient_user_external_idx" ON "recipient" ("userId", "externalId");
CREATE INDEX "recipient_user_email_idx" ON "recipient" ("userId", "email");

CREATE TABLE "segment" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "filter" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "segment_user_updated_idx" ON "segment" ("userId", "updatedAt");
```

```ts
export interface RecipientTable {
  id: string; userId: string; externalId: string | null; email: string | null; phone: string | null
  locale: string | null; timezone: string | null; attributes: string | null; createdAt: string; updatedAt: string
}
export interface SegmentTable {
  id: string; userId: string; name: string; filter: string; createdAt: string; updatedAt: string
}
```

The `delivery` table gained `recipientId` (nullable) from this milestone for per-recipient attribution.

## API surface
All routes: `requireAuth`, user-scoped.
- `GET/POST/PATCH/DELETE /api/recipients` — CRUD contacts.
- `POST /api/recipients/identify` — upsert by `externalId` with attributes (SDK/event path).
- `GET/POST/PATCH/DELETE /api/segments` — CRUD segments; `GET /api/segments/:id/preview` returns count + sample.
  - List query (M06 contract): default sort `updatedAt desc`; keyset cursor on `(updatedAt, id)`. Sortable: `name`, `updatedAt`, `createdAt`. Filterable: `q` (free-text on `name`). AND-ed with `userId` scope; unknown sort/filter → `422`.
- `POST /api/notifications` (extended M10) — accepts `segmentId` as a target; fans out one delivery per recipient.

## Frontend
- `packages/views/src/pages/audiences.tsx`: real segment list (name, live count via preview), segment-builder dialog (attribute/operator/value rows → `FilterNode`), and a recipients table.
- `packages/core/src/hooks/audiences.ts`: `useSegments`, `useSegmentPreview`, `useRecipients`, `useIdentifyRecipient`.

## Acceptance criteria
- [x] Importing contacts creates user-scoped `recipient` rows; `identify` upserts by `externalId`.
- [x] A segment like `plan = "pro"` previews an accurate count and resolves to the right recipients at send time.
- [x] Sending to a segment fans out one personalized delivery per recipient, with template variables filled from each recipient's attributes.
- [x] Audiences page shows real segments + counts and a working recipient table (no mock data).
- [x] `GET /api/segments` honors M06 contract: `updatedAt desc` default, allow-listed sort/filter, `limit` capped at 100, user-scoped, unknown key → `422`.

## Risks & notes
- `attributes` is schemaless JSON — filtering relies on SQLite `json_extract`; document supported operators and cap filter depth.
- `recipientId` is nullable on `delivery` — segment sends stamp it; direct sends leave it null.
- `resolveSegment()` kept side-effect-free so it can be reused by M35 journey enrollment.
