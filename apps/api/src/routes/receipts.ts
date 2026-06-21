import { Hono } from 'hono'
import { suppress } from '../lib/suppress'
import type { AppEnv } from '../lib/types'

const router = new Hono<AppEnv>()

async function verifyTwilioSignature(signature: string, url: string, params: URLSearchParams, authToken: string): Promise<boolean> {
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  const str = url + sorted.map(([k, v]) => k + v).join('')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(str))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

async function recordEvent(
  db: ReturnType<(typeof import('../db/client'))['db']>,
  deliveryId: string,
  userId: string,
  type: string,
  at: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await db
    .insertInto('delivery_event')
    .values({ id: crypto.randomUUID(), deliveryId, userId, type, at, meta: JSON.stringify(meta) })
    .onConflict((oc) => oc.doNothing())
    .execute()
}

router.post('/:provider', async (c) => {
  const { provider } = c.req.param()

  if (provider === 'twilio') {
    const body = await c.req.text()
    const params = new URLSearchParams(body)
    const messageSid = params.get('MessageSid')
    const messageStatus = params.get('MessageStatus')

    if (!messageSid || !messageStatus) return c.json({ ok: false, error: 'Missing MessageSid or MessageStatus' }, 400)

    const authToken = c.env.TWILIO_AUTH_TOKEN
    const sig = c.req.header('X-Twilio-Signature')
    if (authToken && sig) {
      const url = new URL(c.req.url).toString()
      const valid = await verifyTwilioSignature(sig, url, params, authToken)
      if (!valid) return c.json({ ok: false, error: 'Invalid signature' }, 403)
    }

    const db = c.var.db
    const delivery = await db
      .selectFrom('delivery')
      .where('providerMessageId', '=', messageSid)
      .selectAll()
      .executeTakeFirst()

    if (!delivery) return c.json({ ok: true })

    const ts = new Date().toISOString()

    if (messageStatus === 'delivered') {
      await db.updateTable('delivery').set({ deliveredAt: ts, updatedAt: ts }).where('id', '=', delivery.id).execute()
      await recordEvent(db, delivery.id, delivery.userId, 'delivered', ts, { messageStatus })
    } else if (messageStatus === 'undelivered' || messageStatus === 'failed') {
      await db.updateTable('delivery').set({ bouncedAt: ts, status: 'bounced', updatedAt: ts }).where('id', '=', delivery.id).execute()
      await recordEvent(db, delivery.id, delivery.userId, 'bounced', ts, { messageStatus })
      await suppress(db, delivery.userId, delivery.channel, delivery.recipient, 'hard_bounce')
    }

    return c.json({ ok: true })
  }

  return c.json({ ok: false, error: 'Unknown provider' }, 404)
})

export default router
