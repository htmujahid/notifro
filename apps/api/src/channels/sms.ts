import { registerTransform } from "../compose/transform"
import type { ChannelAdapter } from "./adapter"
import { registerAdapter } from "./registry"
import type { ComposePayload, Connection } from "./types"

export interface SmsProvider {
  body: string
}

interface SmsConfig {
  [key: string]: unknown
}

function buildBody(payload: ComposePayload): string {
  const { content } = payload
  if (content.body.text) return content.body.text
  const title = content.title ?? content.subject ?? ""
  const md = content.body.markdown ?? ""
  return [title, md].filter(Boolean).join(": ").trim()
}

const smsAdapter: ChannelAdapter<SmsConfig, SmsProvider> = {
  type: "sms",

  validateConfig(input) {
    return (input ?? {}) as SmsConfig
  },

  transform(payload, _ctx): SmsProvider {
    return {
      body: buildBody(payload).slice(0, 1600),
    }
  },

  async send(provider, conn, ctx) {
    const accountSid = ctx.env?.TWILIO_ACCOUNT_SID
    const authToken = ctx.env?.TWILIO_AUTH_TOKEN
    const from = ctx.env?.TWILIO_FROM_NUMBER
    if (!accountSid || !authToken || !from) {
      return {
        providerMessageId: null,
        ok: false,
        error:
          "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER",
      }
    }

    const user = await ctx.db
      .selectFrom("user")
      .where("id", "=", conn.userId)
      .select(["phoneNumber", "phoneNumberVerified"])
      .executeTakeFirst()
    if (!user?.phoneNumber || !user.phoneNumberVerified) {
      return {
        providerMessageId: null,
        ok: false,
        error:
          "No verified phone number on account. Add and verify your phone number in account settings first",
      }
    }
    const to = user.phoneNumber

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: provider.body,
        }),
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
      return {
        providerMessageId: null,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },

  async healthCheck(_conn, env) {
    const configured = !!(
      env?.TWILIO_ACCOUNT_SID &&
      env?.TWILIO_AUTH_TOKEN &&
      env?.TWILIO_FROM_NUMBER
    )
    return {
      ok: configured,
      message: configured
        ? "Twilio configured from environment"
        : "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER",
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(smsAdapter)
registerTransform("sms", (payload, ctx) =>
  smsAdapter.transform(payload, ctx as { connection: Connection })
)
