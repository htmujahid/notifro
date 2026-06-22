import { registerTransform } from "../../compose/transform"
import { decrypt } from "../../lib/crypto"
import type { ChannelAdapter } from "../adapter"
import { registerAdapter } from "../registry"
import type { ComposePayload, Connection } from "../types"
import { signWebhook } from "./sign"

export interface WebhookProvider {
  userId: string
  rawBody: string
}

export interface WebhookPostResult {
  ok: boolean
  status: number | null
  error?: string
  latencyMs: number
}

const TIMEOUT_MS = 10000

export async function postWebhook(
  url: string,
  secret: string,
  rawBody: string,
  deliveryId: string,
  headers: Record<string, string> | null
): Promise<WebhookPostResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = await signWebhook(secret, timestamp, rawBody)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(headers ?? {}),
        "Content-Type": "application/json",
        "X-Notifro-Signature": `sha256=${signature}`,
        "X-Notifro-Timestamp": timestamp,
        "X-Notifro-Delivery": deliveryId,
      },
      body: rawBody,
    })
    const latencyMs = Date.now() - start
    if (res.status >= 200 && res.status < 300)
      return { ok: true, status: res.status, latencyMs }
    return {
      ok: false,
      status: res.status,
      error: `HTTP ${res.status}`,
      latencyMs,
    }
  } catch (err) {
    const latencyMs = Date.now() - start
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
      latencyMs,
    }
  }
}

const webhookAdapter: ChannelAdapter<Record<string, never>, WebhookProvider> = {
  type: "webhook",

  validateConfig(_input) {
    return {}
  },

  transform(payload: ComposePayload, { connection }): WebhookProvider {
    return { userId: connection.userId, rawBody: JSON.stringify(payload) }
  },

  async send(provider, _conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey)
      return {
        providerMessageId: null,
        ok: false,
        error: "CONNECTION_ENC_KEY not configured",
      }

    const endpoints = await ctx.db
      .selectFrom("webhook_endpoint")
      .where("userId", "=", provider.userId)
      .where("enabled", "=", 1)
      .selectAll()
      .execute()

    if (endpoints.length === 0) {
      return {
        providerMessageId: null,
        ok: false,
        error: "No enabled webhook endpoints",
      }
    }

    // Endpoints are independent — deliver concurrently instead of serializing
    // each HTTP round-trip in the queue consumer.
    const errors: string[] = []

    const outcomes = await Promise.all(
      endpoints.map(async (ep) => {
        let secret: string
        try {
          secret = await decrypt(ep.secret, encKey)
        } catch {
          errors.push(`${ep.url}: secret decrypt failed`)
          return false
        }
        const headers = ep.headers
          ? (JSON.parse(ep.headers) as Record<string, string>)
          : null
        const result = await postWebhook(
          ep.url,
          secret,
          provider.rawBody,
          crypto.randomUUID(),
          headers
        )
        if (result.ok) return true
        errors.push(`${ep.url}: ${result.error}`)
        return false
      })
    )

    if (outcomes.some(Boolean)) return { providerMessageId: null, ok: true }
    return {
      providerMessageId: null,
      ok: false,
      error: errors.join("; ") || "All webhook deliveries failed",
    }
  },

  async healthCheck(_conn) {
    return {
      ok: true,
      message: "Webhook channel — configure endpoints under Channels",
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(webhookAdapter)
registerTransform("webhook", (payload, ctx) =>
  webhookAdapter.transform(payload, ctx as { connection: Connection })
)
