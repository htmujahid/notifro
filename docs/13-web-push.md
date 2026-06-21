# Milestone 13 — Web push (VAPID)

**Phase:** 3 · **Depends on:** M08, M09, M10 · **Status:** Done

## Goal
Deliver browser push notifications: users grant permission and register a Push subscription, the API
stores it, and the `web_push` `ChannelAdapter` sends VAPID-signed, encrypted payloads to the browser
push service — recorded as a `delivery` like every other channel.

## Why it matters
Web push reaches users when the dashboard tab is closed, with no app store and no third-party provider
bill. It also establishes the device-subscription model and the VAPID signing primitives that mobile
push (M20) and routing/fallback (M29) build on.

## Current state
- `notification` + `delivery` + `ChannelAdapter` exist (M10); the in-app inbox (M11) already resolves
  recipients to user ids — reuse that helper.
- The web client is a Vite SPA (`apps/web`) deployed to Cloudflare; it has no service worker today.
- The API is a Cloudflare Worker; outbound `fetch` to push endpoints is available, but Node's
  `web-push` library is not Workers-native — use a WebCrypto-based approach.
- `apps/api/.dev.vars.example` documents env/secret conventions to extend.

## Scope (in)
- VAPID keypair: generate once, store public key as a build-time env for the web client and the
  private key as an API secret (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- `push_subscription` table: per `userId` + per device/browser, storing the
  endpoint and `p256dh`/`auth` keys.
- `POST /api/push/subscribe` and `POST /api/push/unsubscribe`.
- A service worker in `apps/web` (`public/sw.js`) that handles the `push` event and shows a
  notification; client code to register the SW, request permission, and subscribe.
- A `webPushAdapter` (M08) that encrypts the M09-normalized payload per RFC 8291, signs the request
  with VAPID (JWT via WebCrypto ES256), and POSTs to each of the recipient's subscription endpoints;
  prune subscriptions that return `404`/`410` (expired).

## Out of scope (deferred)
- Mobile push (APNs / FCM) → M20.
- Rich/action buttons in the push payload beyond title/body/icon/url → revisit with M09 rich content.
- Quiet hours / DND gating → M23; preference opt-out → M28.

## Data model
```sql
-- apps/api/migrations/NNNN_push_subscription.sql
CREATE TABLE "push_subscription" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "endpoint" text not null unique,
  "p256dh" text not null,
  "auth" text not null,
  "userAgent" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "push_sub_user_idx" ON "push_subscription" ("userId");
```
```ts
// apps/api/src/db/schema.ts — add to the DB interface (per M05)
export interface PushSubscriptionTable {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
  updatedAt: string
}
// DB: { ...; push_subscription: PushSubscriptionTable }
```
Add the wrangler D1 migration in `apps/api/migrations/` (apply: `wrangler d1 migrations apply DB --local`)
and extend the Kysely `DB` interface (per M05).

## API surface
Session + `requireAuth` (M06); subscriptions are scoped to `session.user.id`.
- `POST /api/push/subscribe` — body = the browser `PushSubscription` JSON (`endpoint`, `keys.p256dh`,
  `keys.auth`); upsert by `endpoint`.
- `POST /api/push/unsubscribe` — body `{ endpoint }`; delete the caller's matching row.
- `GET /api/push/vapid-public-key` — returns the public key for client subscribe (or ship it as a
  `VITE_` env to the web build).

## Frontend
- `apps/web/public/sw.js`: `self.addEventListener('push', ...)` → `registration.showNotification(...)`;
  `notificationclick` → `clients.openWindow(url)`.
- `@workspace/core` hook `usePushRegistration()` (`packages/core/src/hooks/push.ts`): registers the SW,
  requests `Notification.permission`, subscribes via `pushManager.subscribe({ applicationServerKey })`,
  and POSTs to `/api/push/subscribe`; exposes enable/disable used from `packages/views/src/pages/settings.tsx`
  (a "Browser notifications" toggle) and surfaced on `channels.tsx`.
- Web push is browser-only — guard the hook so desktop (Electron) / mobile (Capacitor) shells no-op.

## Implementation steps
1. Generate a VAPID keypair; add `VAPID_*` to `.dev.vars.example` + secrets; expose the public key to
   `apps/web` via a `VITE_VAPID_PUBLIC_KEY` env.
2. Add the `push_subscription` wrangler D1 migration (`apps/api/migrations/`), apply with
   `wrangler d1 migrations apply DB --local`, and add `PushSubscriptionTable` to the Kysely `DB` interface (M05).
3. Add `apps/api/src/routes/push.ts` (subscribe/unsubscribe/vapid-public-key).
4. Implement VAPID + RFC 8291 encryption helpers using WebCrypto (`apps/api/src/channels/web-push/`):
   ECDH shared secret, HKDF, AES-128-GCM payload, ES256 VAPID JWT. (Reference a Workers-compatible
   web-push implementation rather than Node `web-push`.)
5. Implement `webPushAdapter` and register it under `web_push` in the M08 registry; on `404/410` from
   the push service, delete the stale subscription.
6. Add `sw.js` + `usePushRegistration()`; add the Settings toggle and the Channels card.
7. Verify: subscribe in a browser, send `channels:['web_push']`, confirm the OS notification appears
   and a `delivery` row is `delivered`/`failed` accordingly.

## Acceptance criteria
- [ ] A user can enable browser notifications; a `push_subscription` row is created.
- [ ] Sending with `channels:['web_push']` delivers an OS-level notification and records a `delivery`.
- [ ] Expired endpoints (410) are pruned automatically and don't repeatedly fail future sends.
- [ ] Subscriptions are user-scoped; no cross-user delivery is possible.

## Risks & notes
- The encryption (RFC 8291) and VAPID signing are the hard part — isolate them behind small,
  unit-testable helpers; a single byte/header mistake yields silent non-delivery.
- Service worker scope/caching: register `sw.js` at the site root so it controls the whole app; bump a
  version constant to force updates.
- Per-recipient fan-out (one POST per subscription) can be slow inline — fine now, moves behind the
  queue in M21 with no schema change.
