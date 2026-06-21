import type { ContentBlock } from "../compose/schema"
import { registerTransform } from "../compose/transform"
import { decrypt } from "../lib/crypto"
import type { ChannelAdapter } from "./adapter"
import { registerAdapter } from "./registry"
import type { ComposePayload, Connection } from "./types"

interface DiscordEmbed {
  title?: string
  description?: string
  fields?: { name: string; value: string; inline?: boolean }[]
  image?: { url: string }
}

export interface DiscordProvider {
  content?: string
  embeds: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

interface DiscordConfig {
  username?: string
  avatarUrl?: string
}

interface DiscordCredentials {
  webhookUrl: string
}

const TIMEOUT_MS = 10000

function blockToText(block: ContentBlock): string | null {
  switch (block.type) {
    case "heading":
      return `**${block.text}**`
    case "text":
      return block.markdown ?? block.text
    case "button":
      return block.url ? `[${block.label}](${block.url})` : block.label
    case "button_group":
      return block.buttons
        .map((b) => (b.url ? `[${b.label}](${b.url})` : b.label))
        .join(" · ")
    case "divider":
      return "---"
    default:
      return null
  }
}

const discordAdapter: ChannelAdapter<DiscordConfig, DiscordProvider> = {
  type: "discord",

  validateConfig(input) {
    return (input ?? {}) as DiscordConfig
  },

  transform(payload, { connection }): DiscordProvider {
    const { content } = payload
    let cfg: DiscordConfig = {}
    try {
      cfg = JSON.parse(connection.config) as DiscordConfig
    } catch {}

    const title = content.title ?? content.subject
    const descParts: string[] = []
    const body = content.body.markdown ?? content.body.text
    if (body) descParts.push(body)

    const fields: { name: string; value: string; inline?: boolean }[] = []
    let image: { url: string } | undefined

    for (const block of content.blocks ?? []) {
      if (block.type === "fields") {
        for (const f of block.fields)
          fields.push({ name: f.key, value: f.value, inline: true })
        continue
      }
      if (block.type === "image") {
        if (!image) image = { url: block.url }
        continue
      }
      const text = blockToText(block)
      if (text) descParts.push(text)
    }

    const embed: DiscordEmbed = {}
    if (title) embed.title = title.slice(0, 256)
    const description = descParts.join("\n\n").slice(0, 4096)
    if (description) embed.description = description
    if (fields.length > 0) embed.fields = fields.slice(0, 25)
    if (image) embed.image = image

    const fallback = [title, content.body.text ?? content.body.markdown]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000)

    const provider: DiscordProvider = { embeds: [embed] }
    if (fallback) provider.content = fallback
    if (cfg.username) provider.username = cfg.username
    if (cfg.avatarUrl) provider.avatar_url = cfg.avatarUrl
    return provider
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
        error: "No Discord webhook URL — add credentials.webhookUrl",
      }
    }

    let creds: DiscordCredentials
    try {
      creds = JSON.parse(
        await decrypt(conn.credentials, encKey)
      ) as DiscordCredentials
    } catch {
      return {
        providerMessageId: null,
        ok: false,
        error: "Failed to decrypt Discord credentials",
      }
    }
    if (!creds.webhookUrl) {
      return {
        providerMessageId: null,
        ok: false,
        error: "Discord credentials missing webhookUrl",
      }
    }

    let url: URL
    try {
      url = new URL(creds.webhookUrl)
    } catch {
      return {
        providerMessageId: null,
        ok: false,
        error: "Discord webhookUrl is not a valid URL",
      }
    }
    url.searchParams.set("wait", "true")

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (res.status < 200 || res.status >= 300) {
        let detail = `HTTP ${res.status}`
        if (res.status === 429) {
          try {
            const j = (await res.json()) as { retry_after?: number }
            if (j.retry_after != null)
              detail = `HTTP 429 rate limited (retry_after ${j.retry_after}s)`
          } catch {}
        }
        return { providerMessageId: null, ok: false, error: detail }
      }

      let messageId: string | null = null
      try {
        const data = (await res.json()) as { id?: string }
        if (data.id) messageId = data.id
      } catch {}
      return { providerMessageId: messageId, ok: true }
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
        message: "No webhook URL — add credentials.webhookUrl",
        checkedAt: new Date().toISOString(),
      }
    }
    return {
      ok: true,
      message: "Webhook URL present",
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(discordAdapter)
registerTransform("discord", (payload, ctx) =>
  discordAdapter.transform(payload, ctx as { connection: Connection })
)
