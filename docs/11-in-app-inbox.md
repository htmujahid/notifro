# Milestone 11 — In-app inbox + Notifications page

**Phase:** 1 · **Depends on:** M10 · **Status:** Done

## Goal
Add an in-app inbox channel: notifications targeted at the `in_app` channel write a per-recipient
`inbox_message` row, the app shell shows a live unread count, and the Notifications page lists, opens,
and marks messages read — all backed by the API instead of mock data.

## Why it matters
The in-app inbox is the one channel that needs no external provider or OAuth, so it's the fastest way
to give every user a real, persistent notification surface inside the product. It also exercises the
recipient-resolution path (notification → per-user message) that push and email digests reuse later.

## Current state
- `notification` + `delivery` tables and the `ChannelAdapter` contract exist from **M10**; sends fan
  out to channels and record a `delivery` per channel.
- `packages/views/src/pages/notifications.tsx` is mock-only (hardcoded list, local `useState`).
- The app shell header is `packages/core/src/layouts/components/site-header.tsx` (rendered inside
  `app-layout.tsx`); there is no bell / unread indicator today.
- Typed `@renderical/api-client` + query-hook conventions from **M07**; `notificationKeys` factory from M10.

## Scope (in)
- `inbox_message` table (wrangler SQL migration + Kysely `DB` interface): addressed to a
  specific `userId`, with `seenAt`/`readAt` state and a denormalized title/body/icon for cheap rendering.
- An `inAppAdapter` (M08 `ChannelAdapter`) that, for an `in_app` delivery, resolves recipients to user
  ids and inserts one `inbox_message` per recipient; the `delivery` is marked `delivered` immediately
  (in-app is synchronous and reliable).
- REST: list inbox (paginated, unread-first), unread count, mark-one-read, mark-all-read.
- Wire `notifications.tsx` to the real inbox; add a bell + unread badge to `site-header.tsx` that polls
  via TanStack Query `refetchInterval`.

## Out of scope (deferred)
- Real-time push of new messages (WebSocket/SSE) → polling only this milestone; WS deferred.
- Browser/native push delivery → M13 (web push).
- Per-user opt-out / preference center → M27.

## Data model
Wrangler D1 migration (`apps/api/migrations/NNNN_inbox.sql`):
```sql
CREATE TABLE "inbox_message" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "notificationId" text references "notification"("id") on delete set null,
  "deliveryId" text references "delivery"("id") on delete set null,
  "title" text not null,
  "body" text,
  "icon" text,                 -- lucide name or url
  "url" text,                  -- click-through target
  "seenAt" text,               -- appeared in the list / badge cleared
  "readAt" text,               -- opened
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "inbox_user_unread_idx" ON "inbox_message" ("userId", "readAt");
-- M06 list-query: per-user keyset default sort for GET /api/inbox (newest first)
CREATE INDEX "inbox_user_createdAt_idx" ON "inbox_message" ("userId", "createdAt", "id");
```
Kysely interface (add `inbox_message: InboxMessageTable` to the `DB` interface, per M05):
```ts
export interface InboxMessageTable {
  id: string
  userId: string
  notificationId: string | null
  deliveryId: string | null
  title: string
  body: string | null
  icon: string | null
  url: string | null
  seenAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}
```
Add a wrangler D1 migration in `apps/api/migrations/` (apply: `wrangler d1 migrations apply DB --local`) and extend the Kysely `DB` interface (per M05).

## API surface
All session + `requireAuth` (M06), and every query is additionally scoped to `userId = session.user.id`.
- `GET /api/inbox?limit&cursor&filter=unread|all` — caller's messages, newest first.
  - **List query (M06 contract)** — **scope is the owning USER**: every query is
    unconditionally AND-ed with `userId = session.user.id`; no
    filter can widen visibility to another user's messages. This is a per-recipient, fast-growing
    table, so **keyset `cursor` pagination is mandatory** (no `offset`/`page`).
    - **Default sort:** `createdAt desc` (tiebreaker `id`).
    - **Sortable allow-list:** `createdAt` → `inbox_message.createdAt`.
    - **Filterable allow-list:** `filter` read-state (`unread|all|read`) — formalize the existing `filter`
      param through the contract, mapping `unread` → `readAt IS NULL`, `read` → `readAt IS NOT NULL`,
      `all` → no read predicate (default `unread`-first per the page); optional `category`/`type` (eq) if a
      message category column is added.
    - **Pagination mode:** keyset cursor encoding `createdAt`+`id`.
    - **Key checks:** `limit` capped at 100; unknown sort/filter field or operator → `422`; per-user
      scope applied unconditionally; malformed/tampered `cursor` → `422`; stable `id` tiebreaker.
- `GET /api/inbox/unread-count` — `{ count }`.
- `POST /api/inbox/:id/read` — set `readAt`/`seenAt`; 404 if not the caller's message.
- `POST /api/inbox/read-all` — mark all the caller's unread as read.

## Frontend
- `@renderical/core` hooks (`packages/core/src/hooks/inbox.ts`): `useInbox(filter)`,
  `useUnreadCount()` (with `refetchInterval: 30_000`), `useMarkRead()`, `useMarkAllRead()`. Add an
  `inboxKeys` query-key factory; invalidate on mutation.
- `packages/views/src/pages/notifications.tsx`: replace mock list with `useInbox`; clicking a message
  calls `useMarkRead` and navigates to `message.url`; "Mark all read" button → `useMarkAllRead`.
- `packages/core/src/layouts/components/site-header.tsx`: add a bell button with an unread badge driven
  by `useUnreadCount()`; clicking routes to `/notifications`.

## Implementation steps
1. Add `inbox_message`: write a wrangler D1 migration creating it, add `InboxMessageTable` to the Kysely
   `DB` interface (per M05), and apply with `wrangler d1 migrations apply DB --local`.
2. Implement `inAppAdapter` (`apps/api/src/channels/in-app.ts`): resolve `to` → the target user id,
   insert one `inbox_message` per recipient, return `{ status: 'delivered' }`. Register it in the
   M08 channel registry under key `in_app`.
3. Add `apps/api/src/routes/inbox.ts` with the four routes (`createRoute`+`app.openapi`).
4. Confirm `POST /api/notifications` with `channels:['in_app']` (M10 path) now produces inbox rows.
5. Build the `@renderical/core` inbox hooks; wire `notifications.tsx` and the header bell.
6. Verify unread badge updates within the poll interval after a send and clears on read.

## Acceptance criteria
- [ ] Sending a notification with `channels:['in_app']` to N users creates N `inbox_message` rows
      and marks the `delivery` `delivered`.
- [ ] `GET /api/inbox` returns only the caller's own messages (not other users').
- [ ] The header bell shows the correct unread count and updates within ~30s of a new message; opening
      a message decrements it.
- [ ] Notifications page lists real messages, supports unread/all filter, and "Mark all read" works.
- [ ] `GET /api/inbox` paginates by keyset `cursor` (default `createdAt desc`, `id` tiebreaker), caps
      `limit` at 100, enforces the per-user scope under the `filter=unread|all|read` allow-list, and
      returns `422` for an unknown sort/filter value, operator, or a tampered `cursor`.

## Risks & notes
- Recipient resolution (turn `to` into user ids) is shared with later channels — put it in a small
  reusable helper, not inside the adapter, so push/digests reuse it.
- Polling is intentional for now; keep the unread-count query cheap (covered by `inbox_user_unread_idx`).
  A WS/SSE upgrade later only needs to invalidate the same query keys.
- `seenAt` vs `readAt` are distinct (badge-cleared vs opened) — preserve both; analytics (M33) uses them.
