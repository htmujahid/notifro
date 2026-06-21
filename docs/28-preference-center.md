# Milestone 28 — Preference center, subscription topics & compliant unsubscribe

**Phase:** 7 · **Depends on:** M10, M11 · **Status:** Done

## Goal
Give recipients control over what they receive: user-defined subscription **topics/categories**,
per-recipient **per-channel per-category** opt-in/out, a recipient-level **channel priority** order, a
**hosted preference center** with one-click **unsubscribe** (signed links), and **send-time enforcement**
that silently skips opted-out/suppressed recipients — satisfying CAN-SPAM and GDPR.

## Why it matters
Sending without consent controls burns sender reputation and breaks the law (CAN-SPAM requires working
unsubscribe; GDPR requires opt-out + records). A preference center cuts spam complaints and is table
stakes before any broadcast/marketing send. It also feeds routing/fallback (M29) and the consent ledger (M34).

## Current state
- **M10** is the send pipeline: `notification` → many `delivery` rows; channel adapters exist (M10–M20).
- **M11** added the in-app inbox + Notifications page and recipient concepts.
- User-scoped model + `requireAuth` from **M05/M06**; client api-client + hooks from **M07**.
- A recipient is identified per channel (email address, push token, Slack user, etc.) from the channel/
  connection work — preferences key off `(recipient, channel, topic)`.

## Scope (in)
- **Topics**: user-scoped `topic` definitions (key, name, description, whether opt-in by default,
  whether it is "transactional" and therefore non-suppressible).
- **Preferences**: `preference` rows capturing a recipient's choice at `(recipient, channel, topic)`
  granularity, plus a recipient-level **channel priority** ordering (consumed by routing/fallback in M29).
- **Hosted preference center**: a public, token-authenticated page (no login) where a recipient toggles
  topics/channels and unsubscribes — works for email links and is reusable in-app.
- **One-click unsubscribe**: signed, expiring tokens embedded in email (List-Unsubscribe header + footer
  link) and other channels; honors CAN-SPAM (functional for 30+ days, no login, applied promptly) and
  GDPR (records the choice + timestamp).
- **Send-time enforcement**: a `resolvePreferences(recipient, topic, channels)` gate in the pipeline that
  filters channels the recipient opted out of, skips suppressed recipients, and **always allows
  transactional topics**. Skipped deliveries are recorded with a `skipped:preference` status for audit.
- **Management UI**: define topics and view per-recipient preferences in Settings.

## Out of scope (deferred)
- Hard suppression list + consent ledger storage → **M34** (this milestone writes preference choices;
  M34 formalizes the suppression list and consent ledger that preference writes append to).
- Routing rules engine (channel priority is stored here; the routing logic that consumes it) → **M29**.

## Data model
Wrangler D1 SQL migration `apps/api/migrations/0017_preferences_schema.sql`:
```sql
CREATE TABLE "topic" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "key" text not null,
  "name" text not null,
  "description" text,
  "defaultOptIn" integer not null default 1,
  "transactional" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "topic_user_key_idx" ON "topic" ("userId", "key");
CREATE INDEX "topic_user_created_idx" ON "topic" ("userId", "createdAt", "id");

CREATE TABLE "preference" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null references "recipient"("id") on delete cascade,
  "channel" text not null,
  "topicId" text references "topic"("id") on delete cascade,
  "optedIn" integer not null,
  "source" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "preference_idx" ON "preference" ("recipientId", "channel", COALESCE("topicId", ''));
CREATE INDEX "preference_recipient_idx" ON "preference" ("recipientId", "userId");

CREATE TABLE "channel_priority" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null references "recipient"("id") on delete cascade,
  "order" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "channel_priority_recipient_idx" ON "channel_priority" ("recipientId");
```
Kysely interfaces in `apps/api/src/db/schema.ts` (SQLite has no boolean — use `number` 0/1):
```ts
export interface TopicTable {
  id: string; userId: string; key: string; name: string; description: string | null
  defaultOptIn: number; transactional: number; createdAt: string; updatedAt: string
}
export interface PreferenceTable {
  id: string; userId: string; recipientId: string; channel: string; topicId: string | null
  optedIn: number; source: string; createdAt: string; updatedAt: string
}
export interface ChannelPriorityTable {
  id: string; userId: string; recipientId: string; order: string; createdAt: string; updatedAt: string
}
```
Added to `DB`: `topic`, `preference`, `channel_priority`.

## API surface
- **Owner/admin** (`requireAuth`, user-scoped): `GET/POST/PATCH/DELETE /api/topics`;
  `GET /api/recipients/:id/preferences`; `PUT /api/recipients/:id/preferences` (admin override).
  - **List query (M06 contract)** for `GET /api/topics`: default sort `createdAt desc`; keyset cursor
    pagination (`limit` default 20, cap 100). Sortable allow-list: `name`, `createdAt`, `updatedAt`.
    Filterable: `q` → free-text on `name`/`key`; `transactional`/`defaultOptIn` → `eq`. Unknown sort/filter
    keys → `422`; filters parameter-bound and AND-ed with the `userId` scope.
  - `GET /api/recipients/:id/preferences` is a per-recipient singleton view (all preference rows for one
    recipient), not a paginated list — the full list contract does not apply.
- **Public, token-auth** (no session; HMAC-signed token scoped to a recipient):
  `GET  /api/preferences/center?token=…` — fetch current preferences for the page.
  `POST /api/preferences/center?token=…` — update toggles.
  `GET/POST /api/unsubscribe?token=…` — one-click unsubscribe (also honor `List-Unsubscribe=One-Click`).
- Tokens are HMAC-signed (`apps/api/src/lib/preference-token.ts`), encode `{ recipientId, userId, scope, exp }`,
  and are verified server-side. The token-scoped `…/center` and `…/unsubscribe` endpoints are scoped to the
  recipient encoded in the signed token, not a session user; they take no list-query params.

## Frontend
- `packages/views/src/pages/preferences.tsx` — public hosted preference center (public route in
  `packages/views/src/routes/_shared.tsx`, outside the protected tree).
- `packages/views/src/pages/unsubscribe.tsx` — confirmation page for one-click unsubscribe.
- Topic management surfaced in `settings.tsx` (Subscriptions section) + a recipient preferences view.
- `packages/core/src/hooks/preferences.ts` — `useTopics`, `usePreferenceCenter(token)`,
  `useUpdatePreferences`, `useUnsubscribe`.
- Email transform (M10) injects the footer unsubscribe link + `List-Unsubscribe` header.

## Implementation steps
1. Add the migration for `topic`, `preference`, `channel_priority` and their Kysely interfaces (per M05).
2. Build the signed-token helper (`lib/preference-token.ts`): sign/verify HMAC with expiry, scoped to recipient+user.
3. Add topic CRUD + recipient preference routes (`requireAuth`). Add the public token-auth preference-center
   + unsubscribe routes (no session).
4. Implement `resolvePreferences()` (`lib/resolve-preferences.ts`) and insert it into the send pipeline
   **before enqueue/transform**: compute allowed channels per recipient, skip opted-out/suppressed (except
   transactional), and write `skipped:preference` delivery rows for audit.
5. Update the email transform to add the footer link + `List-Unsubscribe` / `List-Unsubscribe-Post` headers
   using a freshly signed token per recipient.
6. Build the public `preferences.tsx` + `unsubscribe.tsx` pages and the Settings topic management UI; add
   the public routes; add `@renderical/core` hooks.

## Acceptance criteria
- [x] An owner can define topics; a send referencing a topic respects each recipient's opt-out per channel.
- [x] The hosted preference center loads from a signed link (no login), shows current toggles, and saves.
- [x] A one-click unsubscribe link immediately opts the recipient out and is reflected on the next send
      (delivery recorded as `skipped:preference`).
- [x] Transactional topics are never suppressed by preferences.
- [x] Emails include a working footer unsubscribe link and `List-Unsubscribe` headers.
- [x] All tokens are HMAC-verified, expiring, and scoped to a single recipient+user; tampering is rejected.
- [x] `GET /api/topics` honors the M06 list contract: `createdAt desc` default, allow-listed sort/filter
      (unknown key → `422`), `limit` capped at 100, user-scoped; the token-scoped preference-center and
      unsubscribe endpoints remain recipient-token-scoped and are unaffected.

## Risks & notes
- **Legal correctness**: unsubscribe must work without authentication and apply promptly — keep the token
  path simple and reliable; never block a genuine unsubscribe.
- Channel priority is **stored** here but consumed by routing/fallback in **M29** — the shape is stable.
- Preference writes here are the user-facing layer; **M34** adds the consent ledger + suppression list that
  this milestone's writes also append to.
