import { registerTransform } from "../../compose/transform"
import type { ChannelAdapter } from "../adapter"
import { registerAdapter } from "../registry"
import type { ComposePayload } from "../types"
import { encryptWebPushPayload } from "./encrypt"
import { buildVapidHeaders } from "./vapid"

export interface WebPushProvider {
  userId: string
  title: string
  body: string | null
  icon: string | null
  url: string | null
}

const webPushAdapter: ChannelAdapter<Record<string, never>, WebPushProvider> = {
  type: "web_push",

  validateConfig(_input) {
    return {}
  },

  transform(payload: ComposePayload, { connection }): WebPushProvider {
    const recipient = payload.recipient as { type: string; userId?: string }
    const userId =
      recipient.type === "user" && recipient.userId
        ? recipient.userId
        : connection.userId
    const title =
      payload.content.subject ?? payload.content.title ?? "New notification"
    const body = payload.content.body?.text ?? null
    return { userId, title, body, icon: null, url: null }
  },

  async send(provider, _conn, ctx) {
    if (!ctx.env?.VAPID_PUBLIC_KEY || !ctx.env?.VAPID_PRIVATE_KEY) {
      return {
        providerMessageId: null,
        ok: false,
        error: "VAPID keys not configured",
      }
    }

    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = ctx.env
    const subject = VAPID_SUBJECT ?? "mailto:admin@renderical.com"

    const subscriptions = await ctx.db
      .selectFrom("push_subscription")
      .where("userId", "=", provider.userId)
      .selectAll()
      .execute()

    if (subscriptions.length === 0) {
      return {
        providerMessageId: null,
        ok: false,
        error: "No push subscriptions for user",
      }
    }

    const notifPayload = JSON.stringify({
      title: provider.title,
      body: provider.body ?? undefined,
      icon: provider.icon ?? undefined,
      url: provider.url ?? undefined,
    })

    // Sends are independent across subscriptions — fan out concurrently rather
    // than blocking the queue consumer on each round-trip.
    const errors: string[] = []
    const expiredSubIds: string[] = []

    const outcomes = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const encrypted = await encryptWebPushPayload(
            sub.p256dh,
            sub.auth,
            notifPayload
          )
          const vapidHeaders = await buildVapidHeaders(
            sub.endpoint,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            subject
          )

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              TTL: "86400",
              ...vapidHeaders,
            },
            body: encrypted,
          })

          if (res.status === 404 || res.status === 410) {
            expiredSubIds.push(sub.id)
            return false
          }

          if (res.ok || res.status === 201) return true
          errors.push(`${sub.endpoint}: HTTP ${res.status}`)
          return false
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err))
          return false
        }
      })
    )

    // Prune dead subscriptions in a single statement.
    if (expiredSubIds.length > 0) {
      await ctx.db
        .deleteFrom("push_subscription")
        .where("id", "in", expiredSubIds)
        .execute()
    }

    if (outcomes.some(Boolean)) return { providerMessageId: null, ok: true }
    return {
      providerMessageId: null,
      ok: false,
      error: errors.join("; ") || "All push sends failed",
    }
  },

  async healthCheck(_conn) {
    return {
      ok: true,
      message: "Web push — check VAPID keys are configured",
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(webPushAdapter)
registerTransform("web_push", (payload, ctx) =>
  webPushAdapter.transform(
    payload,
    ctx as { connection: import("../types").Connection }
  )
)
