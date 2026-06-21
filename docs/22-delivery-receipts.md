# Milestone 22 — Delivery receipts, open/click tracking & bounce handling

**Phase:** 4 · **Depends on:** M21 · **Status:** Done

## Goal
Extend the delivery lifecycle beyond `sent` to `delivered`/`opened`/`clicked`: add an email open pixel and
click-tracking link rewriting, ingest provider webhook receipts (bounce/complaint/delivered callbacks),
and feed bounces into the suppression hook.

## Why it matters
"Sent" isn't "delivered." Engagement signals (opens, clicks) and negative signals (bounces, complaints)
power the platform's analytics (M33) and compliance (suppression, M34).
Without receipts, delivery status is a half-truth.

## Current state
- M21 runs delivery on a queue and records `queued→retrying→sent|failed|dead`.
- The `delivery` table (M10) has provider message ids and timestamps but no engagement columns.
- No public callback/pixel endpoints exist yet.

## Scope (in)
- **Lifecycle extension**: add `delivered`, `opened`, `clicked` states + timestamps to `delivery`; a
  `delivery_event` table (append-only: type, timestamp, metadata) for the full history.
- **Open tracking**: an HTML email open pixel (`GET /t/o/:token.gif`) that resolves a signed token →
  delivery, records `opened`, returns a 1×1 gif. Tokens are opaque + signed (no raw ids in URLs).
- **Click tracking**: rewrite links in outgoing HTML email to `GET /t/c/:token?u=<signed-url>`, record
  `clicked`, then 302 to the original URL. Opt-out per channel/message (privacy).
- **Provider receipts**: a webhook ingestion endpoint per provider class (`POST /webhooks/:provider`) that
  verifies the provider signature and maps bounce/complaint/delivered events to `delivery` status updates
  by `providerMessageId`.
- **Bounce → suppression hook**: on hard bounce/complaint, call a `suppress(recipient, reason)` hook
  (the suppression list itself is built in M34; here we define and invoke the hook + record the event).

## Out of scope (deferred)
- Analytics aggregation / dashboards over these events → M33.
- The suppression list storage + enforcement → M34 (this milestone calls the hook).
- Non-email engagement (push open, Slack read) → best-effort, note per-channel support; email is the baseline.

## Data model
- `delivery` (M10): add `deliveredAt?`, `openedAt?`, `clickedAt?`, `bouncedAt?`.
- `delivery_event`: `deliveryId`, `type` (`delivered|opened|clicked|bounced|complained`), `at`, `meta` (json).
- M06 list-query: index the new engagement timestamp columns so they back the engagement-state filters on
  the deliveries lists (M21/M34) — e.g. `(userId, deliveredAt)`, `(userId, openedAt)`,
  `(userId, clickedAt)`, `(userId, bouncedAt)` — and index `delivery_event (deliveryId, type)`.
- Signed-token strategy: HMAC over `deliveryId`+`type` using a Worker secret (no DB row needed) or a
  `tracking_token` table if you prefer revocable tokens.

## API surface
- `GET /t/o/:token.gif` — open pixel (public, no auth, signed token).
- `GET /t/c/:token` — click redirect (public, signed token + signed target URL).
- `POST /webhooks/:provider` — provider receipt ingestion (verify provider signature; no session auth).
- Engagement fields appear in `GET /api/notifications/:id` and `GET /api/deliveries/:id`.
- **List query (M06 contract)** — this milestone adds engagement state, not a new list endpoint. Any
  deliveries list defined elsewhere (M21 `GET /api/deliveries/dead`, M34 logs) **extends its M06
  `filterable` allow-list** with engagement-state `eq` filters (`delivered`, `opened`, `clicked`,
  `bounced`) resolved against the new lifecycle columns/`delivery_event` history, AND-ed with the
  mandatory `userId` scope and parameter-bound like every other filter. No new sortable keys or
  pagination mode are introduced here — those lists keep their existing keyset `cursor` contract.

## Frontend
- Notification/delivery detail (consumed by Logs M34 and Analytics M33): show the event timeline
  (sent → delivered → opened → clicked / bounced).
- Compose (M10 create page): a per-message "track opens/clicks" toggle.

## Implementation steps
1. Add the lifecycle columns + `delivery_event` table; add a wrangler D1 migration (apply: `wrangler d1 migrations apply DB --local`) and extend the Kysely `DB` interface (M05).
2. Implement signed-token helpers (HMAC sign/verify) reused by pixel + click endpoints.
3. Add the open-pixel and click-redirect routes (public, unauthenticated, constant-time token verify).
4. In the EmailChannelAdapter (M10), inject the open pixel + rewrite links when tracking is enabled.
5. Add `POST /webhooks/:provider` with per-provider signature verification; map events → status + `delivery_event`.
6. Define + invoke the `suppress()` hook on hard bounce/complaint (record event; storage lands in M34).

## Acceptance criteria
- [x] Opening a tracked email records `opened` + a `delivery_event`; clicking a link records `clicked` and
      redirects to the original URL.
- [x] A provider bounce webhook (signature-verified) flips the delivery to `bounced` and fires `suppress()`.
- [x] Tracking tokens are signed/opaque — tampering or guessing ids fails verification.
- [x] The delivery timeline reflects sent → delivered → opened → clicked accurately.
- [x] The deliveries lists (M21/M34) expose engagement-state filters (`delivered`/`opened`/`clicked`/
      `bounced` as `eq`), backed by indexed engagement timestamp columns and AND-ed with the org scope.

## Risks & notes
- Privacy/GDPR: open/click tracking is sensitive; make it per-message opt-out and document it (ties to M28/M34).
- Webhook endpoints are unauthenticated by design — they **must** verify provider signatures and be
  idempotent (providers retry receipts).
- Don't leak recipient identity in tracking URLs; always go through signed tokens.
