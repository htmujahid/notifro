import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'

export interface InAppProvider {
  targetUserId: string
  title: string
  body: string | null
  icon: string | null
  url: string | null
}

const inAppAdapter: ChannelAdapter<Record<string, never>, InAppProvider> = {
  type: 'in_app',

  validateConfig(_input) {
    return {}
  },

  transform(payload, { connection }): InAppProvider {
    const recipient = payload.recipient as { type: string; userId?: string; email?: string }
    const targetUserId = recipient.type === 'user' && recipient.userId ? recipient.userId : connection.userId
    const title = payload.content.subject ?? payload.content.title ?? 'New notification'
    const body = payload.content.body?.text ?? null
    return { targetUserId, title, body, icon: null, url: null }
  },

  async send(provider, _conn, ctx) {
    const id = crypto.randomUUID()
    const ts = new Date().toISOString()
    await ctx.db
      .insertInto('inbox_message')
      .values({
        id,
        userId: provider.targetUserId,
        notificationId: ctx.notificationId ?? null,
        deliveryId: null,
        title: provider.title,
        body: provider.body,
        icon: provider.icon,
        url: provider.url,
        seenAt: null,
        readAt: null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
    return { providerMessageId: id, ok: true }
  },

  async healthCheck(_conn) {
    return { ok: true, message: 'In-app channel is always available', checkedAt: new Date().toISOString() }
  },
}

registerAdapter(inAppAdapter)
registerTransform('in_app', (payload, ctx) => inAppAdapter.transform(payload, ctx as { connection: Connection }))
