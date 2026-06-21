# M20 · Mobile push (APNs / FCM)

**Status:** Done
**Depends on:** M08 (channel registry), M09 (compose schema), M10 (email channel as reference)

---

## Goal

Deliver unified notifications to the native iOS and Android shells as real push notifications: register device tokens from the Capacitor apps, and add a `mobile_push` `ChannelAdapter` that sends via APNs (token-based `ES256` JWT) and FCM (HTTP v1). Web push (VAPID) is the separate `web_push` channel (M13) — this is **native** mobile push.

---

## Current state

- `ChannelType` is the 10-type union (the original 7 + `slack`, `discord`, `teams`) and does **not** include `mobile_push` — this milestone adds it.
- `apps/ios` / `apps/android` are Capacitor + Vite + React shells rendering shared `@renderical/views`; `packages/mobile-shared` is a placeholder (README only) — this milestone gives it a `package.json` + first export.
- M13 (web push) established the per-recipient fan-out + stale-subscription pruning pattern: store one subscription row per device, send one provider call per device, prune `404/410` (web push) / `BadDeviceToken`/`UNREGISTERED` (mobile). Mirror it.
- Credentials are encrypted via `lib/crypto` + `CONNECTION_ENC_KEY`, decrypted at send with `ctx.env.CONNECTION_ENC_KEY`. Data is **user-scoped** (`userId` FK), not org-scoped.

---

## Data model

```sql
-- apps/api/migrations/NNNN_device_token.sql
CREATE TABLE "device_token" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "platform" text not null,            -- 'ios' | 'android'
  "token" text not null unique,
  "active" integer not null default 1, -- 0 | 1
  "lastSeenAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "device_token_user_idx" ON "device_token" ("userId");
CREATE INDEX "device_token_user_active_idx" ON "device_token" ("userId", "active");
```
```ts
// apps/api/src/db/schema.ts — add to the DB interface (per M05)
export interface DeviceTokenTable {
  id: string
  userId: string
  platform: string          // 'ios' | 'android'
  token: string
  active: number            // 0 | 1
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}
// DB: { ...; device_token: DeviceTokenTable }
```

APNs/FCM credentials live in `connection.credentials` (`type='mobile_push'`), encrypted at rest:
```
connection.type = 'mobile_push'
connection.credentials = encrypt({
  apns?: { keyId, teamId, bundleId, p8 },          // token-based JWT (ES256)
  fcm?:  { projectId, serviceAccountJson }          // OAuth2 → HTTP v1
})
connection.config = {}
```

---

## API surface

Session + `requireAuth` (M06), user-scoped.
- `POST /api/devices` — body `{ platform, token }` → upsert the caller's `device_token` (unique by `token`).
- `DELETE /api/devices/:token` — deactivate on logout / permission revoke (scoped to caller).
- `mobile_push` sends go through the existing `POST /api/notifications` path (real connection required, no synthetic).

---

## Implementation steps

1. Add `'mobile_push'` to `ChannelType` + `CHANNEL_TYPES` (`channels/types.ts`), `CHANNEL_TYPE_VALUES` (`compose/schema.ts`), and a `CHANNEL_META.mobile_push` card in `channels.tsx`.
2. Add the `device_token` wrangler D1 migration; apply with `wrangler d1 migrations apply DB --local`; add `DeviceTokenTable` to the Kysely `DB` interface (M05).
3. Add `apps/api/src/routes/devices.ts` (`POST`/`DELETE`, `requireAuth`, userId-scoped); mount in `index.ts`.
4. `apps/api/src/channels/mobile-push/apns.ts` — `ES256` JWT signer (import the `.p8` PKCS#8 via WebCrypto) + HTTP/2 send to `/3/device/{token}`; cache the auth token ~1h per connection.
5. `apps/api/src/channels/mobile-push/fcm.ts` — service-account → OAuth2 access token (cache ~1h) + HTTP v1 send to `/v1/projects/{id}/messages:send`.
6. `apps/api/src/channels/mobile-push/adapter.ts` — `transform` (payload → APNs `aps` + FCM `message`, strip markdown to plain text); `send` resolves the recipient's active `device_token` rows, fans out one call per device (decrypt creds via `ctx.env.CONNECTION_ENC_KEY`), records one `delivery` outcome; on `BadDeviceToken`/`UNREGISTERED` set `device_token.active = 0`. Register in the M08 registry; `import './channels/mobile-push/adapter'` in `index.ts`.
7. `packages/mobile-shared/` — add `package.json` (`@renderical/mobile-shared`) + `src/push.ts` exporting `registerForPush(api)` (permission → native token via `@capacitor/push-notifications` → `POST /api/devices`) and `unregisterPush(api)`; call `registerForPush` post-login in `apps/ios/src/App.tsx` + `apps/android/src/App.tsx`.

---

## Acceptance criteria

- [ ] After sign-in on iOS/Android, a `device_token` row is created for the caller (user-scoped, unique by token).
- [ ] A user can upload APNs and/or FCM credentials (encrypted) and a `mobile_push` send delivers to their device.
- [ ] Composing on `mobile_push` fans out one provider call per active device token and records the outcome.
- [ ] An invalid/`UNREGISTERED` token is marked `active = 0` and skipped on the next send.
- [ ] Secrets (`.p8` key, FCM service account) are never returned to the client (credentials redacted).
- [ ] `pnpm typecheck` and `pnpm build` pass; the migration applies cleanly.

## Risks & notes

- APNs needs HTTP/2 — confirm the Workers `fetch` path supports it; if not, document a provider-relay fallback (note for M36).
- `ES256` JWT signing + FCM service-account OAuth use WebCrypto (`crypto.subtle`); import keys as PKCS#8 (the `.p8` body). Reuse the JWT/HKDF helper shape from M13's web-push crypto.
- Cache APNs auth tokens (~1h) and FCM access tokens (~1h) per connection to avoid re-signing every send.
- One unified notification → many deliveries (per device); keep per-token outcomes so M22 (receipts/bounces) and M33 (analytics/cost) attribute correctly.
