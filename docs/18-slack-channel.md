# M18 · Slack Channel (Bot token + Block Kit)

**Status:** Done
**Depends on:** M08 (channel registry), M09 (compose schema), M10 (email channel as reference)

---

## Goal

Implement the `slack` channel adapter using a **manually-created Slack bot token** (no OAuth flow). The user creates a Slack app, installs it to their workspace, copies the bot token (`xoxb-…`), and pastes it into a connection — exactly the bot pattern used for Telegram (M17). Renderical posts unified notifications into a target channel via `chat.postMessage`, rendered as native Block Kit.

This is **not** an OAuth integration. There is no install/redirect/callback flow and no better-auth involvement — the bot token is a stored, encrypted credential like the Twilio/Telegram tokens.

---

## Current state

- `ChannelType` is the 7-type union (`email | webhook | web_push | sms | whatsapp | telegram | in_app`) — it does **not** yet include `slack`. This milestone adds it.
- `compose/transform.ts` has no `slack` entry yet.
- Telegram (M17) established the exact pattern to copy: bot token in `connection.credentials` (encrypted via `lib/crypto` + `CONNECTION_ENC_KEY`), target in `connection.config`, decrypt at send with `ctx.env.CONNECTION_ENC_KEY`, no synthetic connection (a real connection row is required).
- `packages/views/src/pages/channels.tsx` lists a static Slack-less grid keyed off `CHANNEL_TYPES`; adding `slack` to the union + meta surfaces a card automatically.

---

## Data model

No new migration. Reuses the existing `connection` table:

```
connection.type = 'slack'
connection.credentials = encrypt({ botToken: "xoxb-..." })
connection.config = { channelId: "C0123456789" }   // target channel / group / DM id
```

The user obtains `channelId` from Slack (channel details → copy channel ID) and invites the bot to that channel.

---

## Implementation steps

### 1 · Add `slack` to the channel type union

- `apps/api/src/channels/types.ts`: add `'slack'` to `ChannelType` + `CHANNEL_TYPES`.
- `apps/api/src/compose/schema.ts`: add `'slack'` to `CHANNEL_TYPE_VALUES`.
- `packages/views/src/pages/channels.tsx`: add a `CHANNEL_META.slack` entry + include `slack` in the rendered `channelTypes`.

### 2 · `apps/api/src/channels/slack.ts`

Mirror `telegram.ts`:

```typescript
import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { decrypt } from '../lib/crypto'

export interface SlackProvider {
  channelId: string
  text: string
  blocks: unknown[]
}

interface SlackConfig { channelId?: string }
interface SlackCredentials { botToken: string }

const TIMEOUT_MS = 15000
```

- `validateConfig` — passthrough `{ channelId? }`.
- `transform` — read `config.channelId` (throw if missing); build a Block Kit `blocks[]` from the M09 payload (heading → `header`/`section`, body text/markdown → `section` with `mrkdwn`, buttons → `actions`, images → `image`, fields → `section` with `fields`); also produce a plain `text` fallback for accessibility/previews. Convert markdown → Slack `mrkdwn` (`*bold*`, `<url|label>`, escape `& < >`).
- `send` — decrypt `credentials.botToken` with `ctx.env.CONNECTION_ENC_KEY`; POST `https://slack.com/api/chat.postMessage` with `Authorization: Bearer <botToken>`, JSON `{ channel, blocks, text }`, and `AbortSignal.timeout(TIMEOUT_MS)`. Slack returns `200` with `{ ok, ts, channel, error? }`; on `ok:true` record `ts` as `providerMessageId`; on `ok:false` mark failed with the Slack `error` code (Slack returns HTTP 200 even on logical errors, so branch on the JSON `ok` field, not the HTTP status).
- `healthCheck` — report bot-token presence (mirror Telegram).
- Register in the adapter + transform registries.

### 3 · Import in `apps/api/src/index.ts`

```typescript
import './channels/slack'
```

No new routes — the connections CRUD + notifications send path already handle `slack` once the type and adapter exist. No synthetic connection (a real `slack` connection is required, like SMS/Telegram).

---

## Acceptance criteria

- [ ] `POST /api/connections` with `{ type: "slack", config: { channelId }, credentials: { botToken } }` returns 201 (credentials redacted in the response and list).
- [ ] `POST /api/notifications` with `channels: ["slack"]` posts a Block Kit message and records the Slack `ts` in `delivery.providerMessageId`.
- [ ] A logical Slack failure (`ok:false`, e.g. `channel_not_found` / bad token) marks the `delivery` failed with the Slack error code.
- [ ] Missing bot token returns a clear error in the delivery row.
- [ ] No OAuth flow, redirect, or better-auth involvement exists for this channel.
- [ ] `pnpm typecheck` and `pnpm build` pass.

## Risks & notes

- Slack `chat.postMessage` returns HTTP 200 on logical errors — always branch on the JSON `ok` field.
- mrkdwn ≠ Markdown: handle links `<url|text>`, bold `*x*`, and escape `& < >` to avoid broken blocks.
- Block Kit caps ~50 blocks/message — truncate long block lists and note overflow.
- The bot must be invited to the target channel, or posting fails with `not_in_channel` — surface that error text verbatim so the user knows to invite it.
