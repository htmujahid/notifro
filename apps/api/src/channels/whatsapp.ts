import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { decrypt } from '../lib/crypto'

export interface WhatsAppProvider {
  to: string
  body: string
}

interface WhatsAppConfig {
  [key: string]: unknown
}

interface WhatsAppCredentials {
  accountSid: string
  authToken: string
}

function withWhatsAppPrefix(value: string): string {
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`
}

function buildBody(payload: ComposePayload): string {
  const { content } = payload
  if (content.body.text) return content.body.text
  const title = content.title ?? content.subject ?? ''
  const md = content.body.markdown ?? ''
  return [title, md].filter(Boolean).join(': ').trim()
}

const whatsappAdapter: ChannelAdapter<WhatsAppConfig, WhatsAppProvider> = {
  type: 'whatsapp',

  validateConfig(input) {
    return (input ?? {}) as WhatsAppConfig
  },

  transform(payload, _ctx): WhatsAppProvider {
    const recipient = payload.recipient as { type: string; phone?: string }
    const phone = recipient.type === 'contact' && recipient.phone ? recipient.phone : ''
    if (!phone) throw new Error('WhatsApp recipient requires contact.phone')

    return {
      to: withWhatsAppPrefix(phone),
      body: buildBody(payload).slice(0, 1600),
    }
  },

  async send(provider, conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey) return { providerMessageId: null, ok: false, error: 'CONNECTION_ENC_KEY not configured' }
    if (!conn.credentials) {
      return { providerMessageId: null, ok: false, error: 'No Twilio credentials — add accountSid and authToken' }
    }

    const user = await ctx.db.selectFrom('user').where('id', '=', conn.userId).select(['phoneNumber', 'phoneNumberVerified']).executeTakeFirst()
    if (!user?.phoneNumber || !user.phoneNumberVerified) {
      return { providerMessageId: null, ok: false, error: 'No verified phone number on account — verify your phone number in account settings' }
    }
    const from = withWhatsAppPrefix(user.phoneNumber)

    let creds: WhatsAppCredentials
    try {
      creds = JSON.parse(await decrypt(conn.credentials, encKey)) as WhatsAppCredentials
    } catch {
      return { providerMessageId: null, ok: false, error: 'Failed to decrypt Twilio credentials' }
    }
    if (!creds.accountSid || !creds.authToken) {
      return { providerMessageId: null, ok: false, error: 'Twilio credentials missing accountSid or authToken' }
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${creds.accountSid}:${creds.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: provider.to, From: from, Body: provider.body }),
      })

      if (!res.ok) {
        let message = `Twilio error ${res.status}`
        try {
          const err = (await res.json()) as { message?: string }
          if (err.message) message = err.message
        } catch {}
        return { providerMessageId: null, ok: false, error: message }
      }

      const data = (await res.json()) as { sid: string }
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

registerAdapter(whatsappAdapter)
registerTransform('whatsapp', (payload, ctx) => whatsappAdapter.transform(payload, ctx as { connection: Connection }))
