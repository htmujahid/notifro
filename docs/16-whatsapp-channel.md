# M16 · WhatsApp Channel (Twilio)

**Status:** Done  
**Depends on:** M15 (SMS channel — reuses Twilio pattern and credentials shape)

---

## Goal

Implement the `whatsapp` channel adapter using Twilio's WhatsApp API. Twilio WhatsApp uses the same REST API as SMS but prefixes phone numbers with `whatsapp:`. Users can optionally share credentials across SMS and WhatsApp connections or maintain separate connections.

---

## Current state

- `ChannelType` includes `'whatsapp'`
- `compose/transform.ts` stub throws `channel_not_implemented`
- No adapter exists yet
- Twilio credentials shape from M15 is the reference pattern

---

## Data model

No new migration. Connection row:

```
connection.type = 'whatsapp'
connection.credentials = encrypt({ accountSid: "ACxxx", authToken: "xxx" })
connection.config = { from: "whatsapp:+15551234567" }   // must include whatsapp: prefix
```

---

## Implementation steps

### 1 · `apps/api/src/channels/whatsapp.ts`

Identical shape to `sms.ts` but:
- `from` and `to` numbers are prefixed with `whatsapp:` before sending to Twilio
- Same Twilio REST endpoint (`/Messages.json`)
- Template messages require pre-approved templates on Twilio side — for M16, send free-form messages and document the template requirement

```typescript
// to: "whatsapp:+1234567890"
// from: config.from (already includes whatsapp: prefix)
```

### 2 · Import in `apps/api/src/index.ts`

```typescript
import './channels/whatsapp'
```

### 3 · Frontend channels page

Update `CHANNEL_META.whatsapp.description` once the adapter is live.

---

## Acceptance criteria

- [ ] `POST /api/connections` with `{ type: "whatsapp", name: "Twilio WhatsApp", config: { from: "whatsapp:+1..." }, credentials: { accountSid: "AC...", authToken: "..." } }` returns 201
- [ ] `POST /api/notifications` with `channels: ["whatsapp"]` and `recipient: { type: "contact", phone: "+1..." }` sends via Twilio WhatsApp API
- [ ] Phone number correctly prefixed with `whatsapp:` in Twilio request
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
