# M19 · Discord & Microsoft Teams Channels (webhook URLs)

**Status:** Done
**Depends on:** M08 (channel registry), M09 (compose schema), M10 (email channel as reference), M14 (generic webhook — reuse its HTTP-post pattern)

---

## Goal

Add two more team channels — Discord and Microsoft Teams — each as a `connection` + `ChannelAdapter`, so a unified notification can be delivered as a Discord embed or a Teams Adaptive Card.

Both connect via a **pasted incoming-webhook / connector URL** — **no OAuth, no bot install flow**. The URL is the credential, stored encrypted, and the adapter POSTs to it. This is the same "paste a URL/token, we POST to it" shape as the generic webhook (M14) and Telegram (M17) — not an identity integration.

---

## Current state

- `ChannelType` is the 8-type union (the original 7 + `slack`) and does **not** include `discord` or `teams` — this milestone adds both.
- M14 (generic webhook) shipped the outbound-POST pattern (`AbortSignal.timeout`, `redirect:'manual'`, non-2xx → failed with status); Discord/Teams are *specialized* webhooks — reuse that shape rather than duplicating fetch logic.
- M09's unified payload (text, markdown, buttons, images, fields) is the adapter input.
- `connection.credentials` is encrypted via `lib/crypto` + `CONNECTION_ENC_KEY`; decrypt at send with `ctx.env.CONNECTION_ENC_KEY` (the M15–M18 pattern).

---

## Data model

No new migration. Reuses the `connection` table. The webhook/connector URL is a secret → store it encrypted in `credentials`, keep non-secret display bits in `config`:

```
# Discord
connection.type = 'discord'
connection.credentials = encrypt({ webhookUrl: "https://discord.com/api/webhooks/..." })
connection.config = { username?: string, avatarUrl?: string }

# Teams
connection.type = 'teams'
connection.credentials = encrypt({ connectorUrl: "https://...webhook.office.com/... | https://...logic.azure.com/..." })
connection.config = { cardVersion?: string }   // default "1.5"
```

---

## Implementation steps

### 1 · Add `discord` and `teams` to the channel type union

- `apps/api/src/channels/types.ts`: add `'discord'`, `'teams'` to `ChannelType` + `CHANNEL_TYPES`.
- `apps/api/src/compose/schema.ts`: add both to `CHANNEL_TYPE_VALUES`.
- `packages/views/src/pages/channels.tsx`: add `CHANNEL_META.discord` / `.teams` entries + include both in the rendered grid.

### 2 · `apps/api/src/channels/discord.ts`

- `validateConfig` — passthrough `{ username?, avatarUrl? }`.
- `transform` — unified payload → Discord `embeds[]`: title/description from heading + text/markdown (Discord markdown subset), `fields` from `fields` blocks, `image`/`thumbnail` from images, buttons → links in the embed description (Discord components need a bot — keep to embeds), top-level `content` plain fallback.
- `send` — decrypt `credentials.webhookUrl`; POST JSON `{ content, embeds, username?, avatar_url? }` with `AbortSignal.timeout`. Discord returns `204` (or message JSON with `?wait=true`); 2xx → delivered, capture `id` as `providerMessageId` when present; non-2xx → failed with status + body (handle `429` `retry_after` as a failed delivery now; M20 retry honors it later).

### 3 · `apps/api/src/channels/teams.ts`

- `validateConfig` — passthrough `{ cardVersion? }`.
- `transform` — unified payload → an **Adaptive Card** (target `1.5`) wrapped in the connector envelope `{ type:"message", attachments:[{ contentType:"application/vnd.microsoft.card.adaptive", content }] }`: `TextBlock`s (`wrap`, markdown), `Image` elements, `Action.OpenUrl` for buttons.
- `send` — decrypt `credentials.connectorUrl`; POST the envelope with `AbortSignal.timeout`. Connector returns `200 "1"` on success; non-2xx → failed.

### 4 · Register + import

- Register both in the M08 registry + transform registry (each file self-registers like the other channels).
- `apps/api/src/index.ts`: `import './channels/discord'` and `import './channels/teams'`.

No new routes — connections CRUD + the notifications send path handle both once the types + adapters exist. Real connection required (no synthetic). A "send test" can reuse the connections `/health` or the notifications path.

---

## Acceptance criteria

- [ ] `POST /api/connections` with `{ type:"discord", credentials:{ webhookUrl } }` (and the Teams equivalent with `connectorUrl`) returns 201, credentials redacted.
- [ ] `POST /api/notifications` with `channels:["discord"]` posts an embed (title, body, image) and writes a `delivery` (delivered on 2xx, failed with status on error).
- [ ] `channels:["teams"]` posts an Adaptive Card that renders in Teams and writes a `delivery`.
- [ ] Invalid/empty URLs are rejected (clear error in the delivery row); no OAuth flow exists for either channel.
- [ ] Both appear in the channel registry and on the Channels page with real connection state.
- [ ] `pnpm typecheck` and `pnpm build` pass.

## Risks & notes

- Teams is migrating Office 365 connectors → Power Automate Workflows webhooks; accept both URL shapes. Target Adaptive Card `1.5`.
- Discord rate-limits webhooks (`429` + `retry_after`) — surface as a failed delivery now; M20 backoff honors `retry_after`.
- Markdown differs per platform (Discord subset vs Adaptive Card TextBlock) — keep each `transform` self-contained; don't share a converter blindly.
- Webhook/connector URLs are secrets — stored encrypted in `credentials`, never returned to the client (redacted like all credentials).
