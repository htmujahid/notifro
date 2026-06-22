import { registerTransform } from "../compose/transform"
import { decrypt } from "../lib/crypto"
import type { ChannelAdapter } from "./adapter"
import { registerAdapter } from "./registry"
import type { ComposePayload, Connection } from "./types"

export interface TelegramProvider {
  chatId: string
  text: string
}

interface TelegramConfig {
  chatId?: string
}

interface TelegramCredentials {
  botToken: string
}

const TIMEOUT_MS = 15000

function buildText(payload: ComposePayload): string {
  const { content } = payload
  const title = content.title ?? content.subject ?? ""
  const body = content.body.text ?? content.body.markdown ?? ""
  return [title, body].filter(Boolean).join("\n\n").slice(0, 4096)
}

const telegramAdapter: ChannelAdapter<TelegramConfig, TelegramProvider> = {
  type: "telegram",

  validateConfig(input) {
    return (input ?? {}) as TelegramConfig
  },

  transform(payload, { connection }): TelegramProvider {
    let chatId = ""
    try {
      const cfg = JSON.parse(connection.config) as TelegramConfig
      if (cfg.chatId) chatId = cfg.chatId
    } catch {}
    if (!chatId) throw new Error("Telegram connection requires config.chatId")

    return { chatId, text: buildText(payload) }
  },

  async send(provider, conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey)
      return {
        providerMessageId: null,
        ok: false,
        error: "CONNECTION_ENC_KEY not configured",
      }
    if (!conn.credentials) {
      return {
        providerMessageId: null,
        ok: false,
        error: "No Telegram bot token. Add credentials.botToken",
      }
    }

    let creds: TelegramCredentials
    try {
      creds = JSON.parse(
        await decrypt(conn.credentials, encKey)
      ) as TelegramCredentials
    } catch {
      return {
        providerMessageId: null,
        ok: false,
        error: "Failed to decrypt Telegram credentials",
      }
    }
    if (!creds.botToken) {
      return {
        providerMessageId: null,
        ok: false,
        error: "Telegram credentials missing botToken",
      }
    }

    try {
      const url = `https://api.telegram.org/bot${creds.botToken}/sendMessage`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: provider.chatId, text: provider.text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!res.ok) {
        let message = `Telegram error ${res.status}`
        try {
          const err = (await res.json()) as { description?: string }
          if (err.description) message = err.description
        } catch {}
        return { providerMessageId: null, ok: false, error: message }
      }

      const data = (await res.json()) as { result?: { message_id?: number } }
      const msgId = data.result?.message_id
        ? String(data.result.message_id)
        : null
      return { providerMessageId: msgId, ok: true }
    } catch (err) {
      return {
        providerMessageId: null,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return {
        ok: false,
        message: "No bot token. Add credentials.botToken",
        checkedAt: new Date().toISOString(),
      }
    }
    return {
      ok: true,
      message: "Bot token present",
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(telegramAdapter)
registerTransform("telegram", (payload, ctx) =>
  telegramAdapter.transform(payload, ctx as { connection: Connection })
)
