# M15 · SMS Channel (Twilio)

**Status:** Done  
**Depends on:** M08 (channel registry), M09 (compose schema), M10 (email channel as reference)

---

## Goal

Implement the `sms` channel adapter using Twilio's Messaging API. Users store their Twilio `accountSid` and `authToken` in an encrypted connection, and Renderical sends SMS via `POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`.

---

## Current state

- `ChannelType` already includes `'sms'`
- The compose schema accepts `recipient.phone` in the contact variant
- `compose/transform.ts` has a stub for `sms` that throws `channel_not_implemented`
- No Twilio client or SMS adapter exists yet

---

## Data model

No new migration needed. Uses the existing `connection` table:

```
connection.type = 'sms'
connection.credentials = encrypt({ accountSid: "ACxxx", authToken: "xxx" })
connection.config = { from: "+15551234567" }   // Twilio from-number
```

---

## API surface

No new routes. The `connections` CRUD and `notifications` send endpoint already handle this.

`POST /api/notifications` with `channels: ["sms"]` will:
1. Look up the user's active `sms` connection
2. Decrypt `credentials.accountSid` + `credentials.authToken`
3. Read `config.from` for the sender number
4. Call Twilio REST API with `To`, `From`, `Body`
5. Record `providerMessageId` (Twilio SID) in delivery row

---

## Implementation steps

### 1 · `apps/api/src/channels/sms.ts`

```typescript
import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { decrypt } from '../lib/crypto'

export interface SmsProvider {
  to: string
  body: string
  from: string
  accountSid: string
  authToken: string
}

interface SmsConfig {
  from?: string
}

interface SmsCredentials {
  accountSid: string
  authToken: string
}

const smsAdapter: ChannelAdapter<SmsConfig, SmsProvider> = {
  type: 'sms',

  validateConfig(input) {
    return (input ?? {}) as SmsConfig
  },

  transform(payload, ctx): SmsProvider {
    const { recipient } = payload
    const phone = recipient.type === 'contact' ? (recipient as any).phone as string : ''
    if (!phone) throw new Error('SMS recipient requires contact.phone')

    const cfg = ctx?.connection ? (JSON.parse(ctx.connection.config) as SmsConfig) : {}

    const body = payload.content.body.text ??
      `${payload.content.title ?? ''}: ${payload.content.body.markdown ?? ''}`.trim()

    return {
      to: phone,
      body: body.slice(0, 1600),
      from: cfg.from ?? '',
      accountSid: '',
      authToken: '',
    }
  },

  async send(provider, conn) {
    try {
      const creds = JSON.parse(
        await decrypt(conn.credentials!, (globalThis as any).__encKey)
      ) as SmsCredentials
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`
      const body = new URLSearchParams({
        To: provider.to,
        From: provider.from,
        Body: provider.body,
      })
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${creds.accountSid}:${creds.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        return { providerMessageId: null, ok: false, error: err.message ?? `Twilio error ${res.status}` }
      }
      const data = await res.json() as { sid: string }
      return { providerMessageId: data.sid, ok: true }
    } catch (err) {
      return { providerMessageId: null, ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return { ok: false, message: 'No credentials — add accountSid and authToken', checkedAt: new Date().toISOString() }
    }
    return { ok: true, message: 'Credentials present', checkedAt: new Date().toISOString() }
  },
}

registerAdapter(smsAdapter)
registerTransform('sms', (payload, ctx) => smsAdapter.transform(payload, ctx as { connection: Connection }))
```

Note: `decrypt` needs `CONNECTION_ENC_KEY`. Pass it via env binding to the adapter, or accept it as a separate argument from the notifications route. The cleanest approach is to have the notifications route decrypt credentials before calling `adapter.send()`, but for SMS the pattern is simpler — the route can pass the env key. See M10 email adapter for the pattern reference.

### 2 · Import in `apps/api/src/index.ts`

Add:
```typescript
import './channels/sms'
```

### 3 · Update `RecipientSchema` in compose schema

Ensure `contact` variant has `phone: z.string().optional()` (it already does).

### 4 · Update `apps/api/src/channels/types.ts` RecipientSchema usage

No changes needed — `recipient.phone` already exists in the contact variant.

---

## Acceptance criteria

- [ ] `POST /api/connections` with `{ type: "sms", name: "Twilio SMS", config: { from: "+1..." }, credentials: { accountSid: "AC...", authToken: "..." } }` returns 201
- [ ] `POST /api/notifications` with `channels: ["sms"]` and `recipient: { type: "contact", phone: "+1..." }` delivers and records a Twilio SID in delivery.providerMessageId
- [ ] Missing credentials return a clear error in the delivery row
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
