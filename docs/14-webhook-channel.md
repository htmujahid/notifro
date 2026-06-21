# Milestone 14 — Generic webhook channel (HMAC signing)

**Phase:** 3 · **Depends on:** M08, M09, M10 · **Status:** Done

## Goal
Let a user register HTTP endpoints and deliver the normalized notification payload to them as a signed
POST. Each request carries an HMAC-SHA256 signature and a timestamp so receivers can verify authenticity
and reject replays — recorded as a `delivery` like every other channel.

## Why it matters
Webhooks make Renderical extensible to anything a customer can host (internal systems, Zapier-style
relays, custom channels we don't natively support). Signed delivery is table-stakes for trust, and the
HMAC primitive here is reused by signed inbound webhooks (M31) and compliance (M34).

## Current state
- `notification` + `delivery` + `ChannelAdapter` exist (M10). The channel registry + connection storage
  exist from **M08** — webhook endpoints are stored as `connection` rows of type `webhook`.
- `channels.tsx` already shows a mock "Webhook — 3 endpoints configured" card to make real.
- The Worker can `fetch()` arbitrary URLs; WebCrypto (`crypto.subtle`) is available for HMAC.

## Scope (in)
- Webhook endpoint config stored via the M08 connection model: `url`, a generated signing `secret`,
  optional custom `headers`, and an `enabled` flag. Support multiple endpoints per user.
- A `webhookAdapter` (M08) that POSTs the M09-normalized payload as JSON to each enabled endpoint with:
  `X-Renderical-Signature: sha256=<hex>`, `X-Renderical-Timestamp: <unix>`, `X-Renderical-Delivery: <deliveryId>`.
  Signature = HMAC-SHA256(secret, `<timestamp>.<rawBody>`).
- CRUD for webhook endpoints (create returns the secret once), per-endpoint enable/disable, and a
  "send test" action.
- Surface webhook endpoints on `channels.tsx` (list, add, enable/disable, reveal-once secret).

## Out of scope (deferred)
- **Inbound** webhook ingestion (events that *trigger* sends) → M31.
- Delivery receipts / ret/ open tracking from the receiver → M22; retries → M21 (single inline attempt
  here, status from HTTP response only).
- Replay-protection enforcement on *our* inbound endpoints → M34 (this milestone signs *outbound*).

## Data model
Reuse the M08 `connection` table (`type='webhook'`, user-scoped) with config JSON, e.g.:
```ts
// stored in connection.config (json) for type 'webhook'
{ url: string, secret: string, headers?: Record<string,string>, enabled: boolean, description?: string }
```
If M08's connection model can't hold multiple webhook endpoints cleanly, add a thin
`webhook_endpoint` table (user-scoped, `url`/`secret`/`headers`/`enabled`/`description` + timestamps) as a
wrangler D1 migration plus a `WebhookEndpointTable` entry in the Kysely `DB` interface (per M05). Prefer
reusing `connection`; document the choice in the file you implement.

## API surface
Session + `requireAuth` (M06), user-scoped.
- `GET /api/channels/webhooks` — list endpoints (secret redacted to last 4).
- `POST /api/channels/webhooks` — create; returns the full `secret` exactly once.
- `PATCH /api/channels/webhooks/:id` — update url/headers/`enabled`.
- `DELETE /api/channels/webhooks/:id`.
- `POST /api/channels/webhooks/:id/test` — send a sample signed payload, return status/latency.

**List query (M06 contract)** — `GET /api/channels/webhooks` uses `listQuery`/`applyListQuery`:
- **Pagination**: offset/`page` acceptable (small per-user list); cursor supported. Response `{ data, nextCursor }`, `limit` default 20 / cap 100.
- **Default sort**: `createdAt desc` (tiebreaker `id`).
- **Sortable allow-list**: `createdAt`, `name` (or `url` if no name field).
- **Filterable allow-list**: `enabled` (`eq`, boolean) — or `status` (`eq`) if stored as a connection status; `q` free-text bound to the `name`/`url`/`description` columns.
- **Checks**: limit cap; sort/filter keys resolved through the allow-list to known columns (unknown key/operator → `422`, never interpolated); filters parameter-bound and AND-ed with the mandatory user scope; the `secret` stays redacted to last 4 in every listed row; malformed cursor → `422`. Whichever store is chosen (reused `connection` or new `webhook_endpoint`), back the user scope + `enabled`/`q` columns with an index.

## Frontend
- `@workspace/core` hooks (`packages/core/src/hooks/webhooks.ts`): `useWebhooks()`, `useCreateWebhook()`,
  `useUpdateWebhook()`, `useDeleteWebhook()`, `useTestWebhook()` via `@workspace/api-client` (M07).
- `packages/views/src/pages/channels.tsx`: replace the mock webhook card with a real list + an
  "Add endpoint" dialog (`@workspace/ui` dialog), reveal-once secret display, enable/disable toggle,
  and a "Send test" button surfacing the response code.

## Implementation steps
1. Decide storage (reuse `connection` vs new `webhook_endpoint`); if adding a table, create a wrangler D1
   migration (`apps/api/migrations/`, apply `wrangler d1 migrations apply DB --local`) + a Kysely `DB` interface entry (M05).
2. Implement the HMAC helper (`apps/api/src/channels/webhook/sign.ts`) with `crypto.subtle.sign('HMAC', ...)`
   over `` `${timestamp}.${rawBody}` `` → hex.
3. Implement `webhookAdapter` (`apps/api/src/channels/webhook/adapter.ts`): serialize payload once, sign, POST to
   each enabled endpoint with a sane timeout; map non-2xx / network error → `delivery.status='failed'` + `error`.
   Register under `webhook` in the M08 registry.
4. Add `apps/api/src/routes/webhooks.ts` (CRUD + test). Generate secrets with `crypto.randomUUID()`/random bytes.
5. Build the `@workspace/core` webhook hooks; wire `channels.tsx`.
6. Verify against a request-bin style endpoint that the signature validates with the shown secret.

## Acceptance criteria
- [ ] A user can add a webhook endpoint and see its secret exactly once.
- [ ] Sending with `channels:['webhook']` POSTs the normalized payload to every enabled endpoint with a
      valid `X-Renderical-Signature` and timestamp; a receiver can recompute and match the HMAC.
- [ ] Non-2xx responses mark the `delivery` `failed` with the status code captured in `error`.
- [ ] Disabled endpoints are skipped; "Send test" reports the real response code/latency.
- [ ] Endpoints are strictly user-scoped.
- [ ] `GET /api/channels/webhooks` returns `{ data, nextCursor }` (default `createdAt desc`), honors the
      `enabled`/`q` filters and sortable allow-list, redacts the secret to last 4, and `422`s an unknown sort/filter key.

## Risks & notes
- Sign over the **raw** serialized body (not a re-stringified object) and have the receiver verify the
  same bytes — re-serialization order mismatches are the classic HMAC bug.
- Include the timestamp in the signed string and document a recommended tolerance window so receivers
  can reject replays; full replay-protection on our own inbound endpoints is M34.
- Outbound fetch to customer URLs is an SSRF surface — note that allowlisting/egress controls are
  addressed in M34; keep a tight timeout and don't follow redirects to internal addresses.
