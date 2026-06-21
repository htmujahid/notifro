# M17 · Telegram Channel (Bot API)

**Status:** Done  
**Depends on:** M08 (channel registry), M09 (compose schema), M10 (email channel — delivery pipeline)

---

## Goal

Implement the `telegram` channel adapter using Telegram's Bot API (`POST https://api.telegram.org/bot{TOKEN}/sendMessage`). The bot token is stored encrypted in connection credentials. Users must start a conversation with the bot first so Telegram can provide a `chat_id` to send messages to.

---

## Current state

- `ChannelType` includes `'telegram'`
- `compose/transform.ts` stub throws `channel_not_implemented`
- No Telegram adapter exists yet

---

## Data model

No new migration. Connection row:

```
connection.type = 'telegram'
connection.credentials = encrypt({ botToken: "123456:ABC..." })
connection.config = { chatId: "-100123456789" }   // target chat/group/channel ID
```

The `chatId` can be a personal chat ID, group ID, or channel ID. Users retrieve it by messaging their bot and calling `getUpdates`, or using `@userinfobot`.

---

## Implementation steps

### 1 · `apps/api/src/channels/telegram.ts`

```typescript
import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'

export interface TelegramProvider {
  chatId: string
  text: string
  parseMode?: 'MarkdownV2' | 'HTML'
  botToken: string
}

interface TelegramConfig {
  chatId?: string
}

interface TelegramCredentials {
  botToken: string
}

const telegramAdapter: ChannelAdapter<TelegramConfig, TelegramProvider> = {
  type: 'telegram',

  validateConfig(input) {
    return (input ?? {}) as TelegramConfig
  },

  transform(payload, ctx): TelegramProvider {
    const cfg = ctx?.connection ? (JSON.parse(ctx.connection.config) as TelegramConfig) : {}
    const chatId = cfg.chatId ?? ''
    if (!chatId) throw new Error('Telegram connection requires config.chatId')

    const title = payload.content.title ?? payload.content.subject ?? ''
    const body = payload.content.body.text ?? payload.content.body.markdown ?? ''
    const text = [title, body].filter(Boolean).join('\n\n').slice(0, 4096)

    return { chatId, text, botToken: '' }
  },

  async send(provider, conn) {
    try {
      const creds = JSON.parse(
        await (await import('../lib/crypto')).decrypt(conn.credentials!, (globalThis as any).__encKey)
      ) as TelegramCredentials
      const url = `https://api.telegram.org/bot${creds.botToken}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: provider.chatId, text: provider.text }),
      })
      if (!res.ok) {
        const err = await res.json() as { description?: string }
        return { providerMessageId: null, ok: false, error: err.description ?? `Telegram error ${res.status}` }
      }
      const data = await res.json() as { result?: { message_id?: number } }
      const msgId = data.result?.message_id ? String(data.result.message_id) : null
      return { providerMessageId: msgId, ok: true }
    } catch (err) {
      return { providerMessageId: null, ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return { ok: false, message: 'No bot token — add credentials.botToken', checkedAt: new Date().toISOString() }
    }
    return { ok: true, message: 'Bot token present', checkedAt: new Date().toISOString() }
  },
}

registerAdapter(telegramAdapter)
registerTransform('telegram', (payload, ctx) => telegramAdapter.transform(payload, ctx as { connection: Connection }))
```

### 2 · Import in `apps/api/src/index.ts`

```typescript
import './channels/telegram'
```

### 3 · Credential decryption pattern

Both Telegram and SMS need `CONNECTION_ENC_KEY` inside `adapter.send()`. The cleanest approach (to avoid passing env into adapters) is to have the notifications route decrypt credentials and merge them into the provider before calling `adapter.send()`. This is a pattern to establish in M21 (delivery queue) or as a pre-processing step in the send route.

---

## Acceptance criteria

- [ ] `POST /api/connections` with `{ type: "telegram", config: { chatId: "..." }, credentials: { botToken: "..." } }` returns 201
- [ ] `POST /api/notifications` with `channels: ["telegram"]` delivers and records `message_id` in delivery.providerMessageId
- [ ] Missing bot token returns clear error in delivery row
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
