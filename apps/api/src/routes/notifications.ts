import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { getAdapter } from '../channels/registry'
import { ComposePayloadSchema } from '../compose/schema'
import type { AppEnv } from '../lib/types'
import type { ChannelType } from '../channels/types'

const SORTABLE = { createdAt: 'createdAt', status: 'status' }
const FILTERABLE = {
  status: { column: 'status', schema: z.enum(['processing', 'completed', 'failed']), operator: 'eq' as const },
}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const DeliveryDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
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
  userId: z.string(),
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
router.use('*', requireAuth)

router.openapi(sendRoute, async (c) => {
  const payload = c.req.valid('json')
  const { db } = c.var
  const userId = c.var.user!.id

  const channels = payload.channels ?? ['email']
  const ts = now()
  const notifId = newId()

  const subject = payload.content.subject ?? payload.content.title ?? null

  await db
    .insertInto('notification')
    .values({
      id: notifId,
      userId,
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
    userId: string
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
          userId,
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
        userId,
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

    const recipientAddr =
      channel === 'sms' || channel === 'whatsapp'
        ? (payload.recipient as { phone?: string }).phone ?? ''
        : (await resolveRecipientEmail(db, payload.recipient as { type: string; email?: string; userId?: string })) ?? ''

    const connRow = await db
      .selectFrom('connection')
      .where('userId', '=', userId)
      .where('type', '=', channel)
      .where('status', '=', 'active')
      .selectAll()
      .executeTakeFirst()

    const synthetic =
      channel === 'email'
        ? { id: 'email', userId, type: 'email' as const, name: 'Email', status: 'active' as const, config: '{}', credentials: null, scopes: '[]', health: null, createdAt: ts, updatedAt: ts }
        : channel === 'in_app'
        ? { id: 'in_app', userId, type: 'in_app' as const, name: 'In-app', status: 'active' as const, config: '{}', credentials: null, scopes: '[]', health: null, createdAt: ts, updatedAt: ts }
        : channel === 'web_push'
          ? { id: 'web_push', userId, type: 'web_push' as const, name: 'Web Push', status: 'active' as const, config: '{}', credentials: null, scopes: '[]', health: null, createdAt: ts, updatedAt: ts }
          : channel === 'webhook'
            ? { id: 'webhook', userId, type: 'webhook' as const, name: 'Webhook', status: 'active' as const, config: '{}', credentials: null, scopes: '[]', health: null, createdAt: ts, updatedAt: ts }
            : null
    const conn = connRow ?? synthetic

    if (!conn) {
      const deliveryId = newId()
      const dts = now()
      await db
        .insertInto('delivery')
        .values({
          id: deliveryId,
          userId,
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
        userId,
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
      const activeConn = conn as import('../channels/types').Connection
      const provider = adapter.transform(payload, { connection: activeConn })
      const result = await adapter.send(provider as any, activeConn, { db: c.var.db, notificationId: notifId, env: c.env })
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
        userId,
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
      userId,
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

  const anyFailed = deliveries.some((d) => d.status === 'failed')
  const finalStatus = anyFailed ? 'failed' : 'completed'

  await db
    .updateTable('notification')
    .set({ status: finalStatus, updatedAt: now() })
    .where('id', '=', notifId)
    .execute()

  const notification = await db
    .selectFrom('notification')
    .where('id', '=', notifId)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json({ ...(notification as typeof notification), deliveries })
})

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db
    .selectFrom('notification')
    .where('userId', '=', userId)
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
  const userId = c.var.user!.id

  const notification = await c.var.db
    .selectFrom('notification')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!notification) throw Errors.notFound('Notification')

  const deliveries = await c.var.db
    .selectFrom('delivery')
    .where('notificationId', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .execute()

  return c.json({ ...(notification as typeof notification), deliveries })
})

export default router
