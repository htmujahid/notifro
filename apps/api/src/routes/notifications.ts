import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireOrg } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { getAdapter } from '../channels/registry'
import { ComposePayloadSchema } from '../compose/schema'
import { maybeRefreshGmailCredentials, decryptGmailCredentials } from '../channels/email-oauth'
import type { EmailProvider } from '../channels/email'
import type { AppEnv } from '../lib/types'
import type { ChannelType } from '../channels/types'

const SORTABLE = { createdAt: 'createdAt', status: 'status' }
const FILTERABLE = {
  status: { column: 'status', schema: z.enum(['processing', 'completed', 'failed']), operator: 'eq' as const },
}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const DeliveryDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  notificationId: z.string(),
  channel: z.string(),
  recipient: z.string(),
  status: z.string(),
  providerMessageId: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const NotificationDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  createdByUserId: z.string().nullable(),
  payload: z.string(),
  subject: z.string().nullable(),
  channels: z.string(),
  mode: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const NotificationWithDeliveriesSchema = NotificationDtoSchema.extend({
  deliveries: z.array(DeliveryDtoSchema),
})

const ListResponseSchema = z.object({
  data: z.array(NotificationDtoSchema),
  nextCursor: z.string().nullable(),
})

const sendRoute = createRoute({
  method: 'post',
  path: '/notifications',
  request: { body: { content: { 'application/json': { schema: ComposePayloadSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: NotificationWithDeliveriesSchema } },
      description: 'Notification sent',
    },
  },
})

const listRoute = createRoute({
  method: 'get',
  path: '/notifications',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated notifications' },
  },
})

const detailRoute = createRoute({
  method: 'get',
  path: '/notifications/:id',
  responses: {
    200: {
      content: { 'application/json': { schema: NotificationWithDeliveriesSchema } },
      description: 'Notification with deliveries',
    },
  },
})

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

async function resolveRecipientEmail(
  db: ReturnType<(typeof import('../db/client'))['db']>,
  recipient: { type: string; email?: string; userId?: string },
): Promise<string | null> {
  if (recipient.type === 'contact' && recipient.email) return recipient.email
  if (recipient.type === 'user' && recipient.userId) {
    const user = await db
      .selectFrom('user')
      .where('id', '=', recipient.userId)
      .select('email')
      .executeTakeFirst()
    return user?.email ?? null
  }
  return null
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireOrg)

router.openapi(sendRoute, async (c) => {
  const payload = c.req.valid('json')
  const { org, db } = c.var

  const channels = payload.channels ?? ['email']
  const ts = now()
  const notifId = newId()

  const subject = payload.content.subject ?? payload.content.title ?? null

  await db
    .insertInto('notification')
    .values({
      id: notifId,
      organizationId: org.id,
      createdByUserId: c.var.user?.id ?? null,
      payload: JSON.stringify(payload),
      subject,
      channels: JSON.stringify(channels),
      mode: 'transactional',
      status: 'processing',
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const deliveries: Array<{
    id: string
    organizationId: string
    notificationId: string
    channel: string
    recipient: string
    status: string
    providerMessageId: string | null
    error: string | null
    attempts: number
    createdAt: string
    updatedAt: string
  }> = []

  for (const channel of channels) {
    const adapter = getAdapter(channel as ChannelType)
    if (!adapter) {
      const deliveryId = newId()
      const dts = now()
      await db
        .insertInto('delivery')
        .values({
          id: deliveryId,
          organizationId: org.id,
          notificationId: notifId,
          channel,
          recipient: '',
          status: 'failed',
          providerMessageId: null,
          error: `No adapter registered for channel: ${channel}`,
          attempts: 1,
          createdAt: dts,
          updatedAt: dts,
        })
        .execute()
      deliveries.push({
        id: deliveryId,
        organizationId: org.id,
        notificationId: notifId,
        channel,
        recipient: '',
        status: 'failed',
        providerMessageId: null,
        error: `No adapter registered for channel: ${channel}`,
        attempts: 1,
        createdAt: dts,
        updatedAt: dts,
      })
      continue
    }

    const recipientAddr = (await resolveRecipientEmail(db, payload.recipient as { type: string; email?: string; userId?: string })) ?? ''

    const conn = await db
      .selectFrom('connection')
      .where('organizationId', '=', org.id)
      .where('type', '=', channel)
      .where('status', '=', 'active')
      .selectAll()
      .executeTakeFirst()

    if (!conn) {
      const deliveryId = newId()
      const dts = now()
      await db
        .insertInto('delivery')
        .values({
          id: deliveryId,
          organizationId: org.id,
          notificationId: notifId,
          channel,
          recipient: recipientAddr,
          status: 'failed',
          providerMessageId: null,
          error: `No active ${channel} connection — connect via Channels page first`,
          attempts: 1,
          createdAt: dts,
          updatedAt: dts,
        })
        .execute()
      deliveries.push({
        id: deliveryId,
        organizationId: org.id,
        notificationId: notifId,
        channel,
        recipient: recipientAddr,
        status: 'failed',
        providerMessageId: null,
        error: `No active ${channel} connection — connect via Channels page first`,
        attempts: 1,
        createdAt: dts,
        updatedAt: dts,
      })
      continue
    }

    let deliveryStatus = 'failed'
    let providerMessageId: string | null = null
    let deliveryError: string | null = null

    try {
      let activeConn = conn as import('../channels/types').Connection
      let provider = adapter.transform(payload, { connection: activeConn }) as Record<string, unknown>

      if (channel === 'email') {
        activeConn = await maybeRefreshGmailCredentials(db, c.env, activeConn)
        const creds = await decryptGmailCredentials(activeConn, c.env.CONNECTION_ENC_KEY)
        provider = { ...provider, accessToken: creds.access_token, fromEmail: creds.email } as Record<string, unknown>
      }

      const result = await adapter.send(provider as unknown as EmailProvider, activeConn)
      providerMessageId = result.providerMessageId
      deliveryStatus = result.ok ? 'delivered' : 'failed'
      if (!result.ok) deliveryError = result.error ?? 'Unknown send error'
    } catch (err) {
      deliveryError = err instanceof Error ? err.message : String(err)
    }

    const deliveryId = newId()
    const dts = now()
    await db
      .insertInto('delivery')
      .values({
        id: deliveryId,
        organizationId: org.id,
        notificationId: notifId,
        channel,
        recipient: recipientAddr,
        status: deliveryStatus,
        providerMessageId,
        error: deliveryError,
        attempts: 1,
        createdAt: dts,
        updatedAt: dts,
      })
      .execute()
    deliveries.push({
      id: deliveryId,
      organizationId: org.id,
      notificationId: notifId,
      channel,
      recipient: recipientAddr,
      status: deliveryStatus,
      providerMessageId,
      error: deliveryError,
      attempts: 1,
      createdAt: dts,
      updatedAt: dts,
    })
  }

  const allOk = deliveries.every((d) => d.status === 'delivered' || d.status === 'sent')
  const anyFailed = deliveries.some((d) => d.status === 'failed')
  const finalStatus = allOk ? 'completed' : anyFailed && deliveries.length === channels.length ? 'failed' : 'completed'

  await db
    .updateTable('notification')
    .set({ status: finalStatus, updatedAt: now() })
    .where('id', '=', notifId)
    .execute()

  const notification = await db
    .selectFrom('notification')
    .where('id', '=', notifId)
    .where('organizationId', '=', org.id)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json({ ...(notification as typeof notification), deliveries })
})

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const baseQuery = c.var.db
    .selectFrom('notification')
    .where('organizationId', '=', c.var.org.id)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof NotificationDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(detailRoute, async (c) => {
  const { id } = c.req.param()

  const notification = await c.var.db
    .selectFrom('notification')
    .where('id', '=', id)
    .where('organizationId', '=', c.var.org.id)
    .selectAll()
    .executeTakeFirst()

  if (!notification) throw Errors.notFound('Notification')

  const deliveries = await c.var.db
    .selectFrom('delivery')
    .where('notificationId', '=', id)
    .where('organizationId', '=', c.var.org.id)
    .selectAll()
    .execute()

  return c.json({ ...(notification as typeof notification), deliveries })
})

export default router
