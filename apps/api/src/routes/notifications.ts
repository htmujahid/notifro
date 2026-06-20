import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { getAdapter } from '../channels/registry'
import { resolveSendConnection } from '../channels/resolve'
import { ComposePayloadSchema } from '../compose/schema'
import type { AppEnv } from '../lib/types'
import type { ChannelType } from '../channels/types'
import type { DeliveryQueueMessage } from '../queue/consumer'

const SORTABLE = { createdAt: 'createdAt', status: 'status' }
const FILTERABLE = {
  status: {
    column: 'status',
    schema: z.enum(['queued', 'processing', 'completed', 'failed']),
    operator: 'eq' as const,
  },
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
  nextRetryAt: z.string().nullable(),
  lastError: z.string().nullable(),
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
      description: 'Notification enqueued',
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

async function resolveRecipientAddress(
  db: ReturnType<(typeof import('../db/client'))['db']>,
  channel: string,
  recipient: Record<string, unknown>,
): Promise<string> {
  if (channel === 'sms' || channel === 'whatsapp') {
    return (recipient.phone as string | undefined) ?? ''
  }
  if (recipient.type === 'contact' && recipient.email) return recipient.email as string
  if (recipient.type === 'user' && recipient.userId) {
    const user = await db
      .selectFrom('user')
      .where('id', '=', recipient.userId as string)
      .select('email')
      .executeTakeFirst()
    return user?.email ?? ''
  }
  return ''
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(sendRoute, async (c) => {
  const payload = c.req.valid('json')
  const { db } = c.var
  const userId = c.var.user!.id
  const ts = now()

  if (payload.idempotencyKey) {
    const existing = await db
      .selectFrom('idempotency_key')
      .where('userId', '=', userId)
      .where('key', '=', payload.idempotencyKey)
      .where('expiresAt', '>', ts)
      .selectAll()
      .executeTakeFirst()

    if (existing) {
      const notification = await db
        .selectFrom('notification')
        .where('id', '=', existing.notificationId)
        .where('userId', '=', userId)
        .selectAll()
        .executeTakeFirst()

      if (notification) {
        const deliveries = await db
          .selectFrom('delivery')
          .where('notificationId', '=', existing.notificationId)
          .where('userId', '=', userId)
          .selectAll()
          .execute()
        return c.json({ ...(notification as typeof notification), deliveries })
      }
    }
  }

  const channels = payload.channels ?? ['email']
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
      status: 'queued',
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  type DeliveryRow = {
    id: string
    userId: string
    notificationId: string
    channel: string
    recipient: string
    status: string
    providerMessageId: string | null
    error: string | null
    attempts: number
    nextRetryAt: string | null
    lastError: string | null
    createdAt: string
    updatedAt: string
  }

  const deliveries: DeliveryRow[] = []

  for (const channel of channels) {
    const adapter = getAdapter(channel as ChannelType)
    const dts = now()
    const deliveryId = newId()

    if (!adapter) {
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
          nextRetryAt: null,
          lastError: `No adapter registered for channel: ${channel}`,
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
        nextRetryAt: null,
        lastError: `No adapter registered for channel: ${channel}`,
        createdAt: dts,
        updatedAt: dts,
      })
      continue
    }

    const conn = await resolveSendConnection(db, userId, channel as ChannelType, dts)
    const recipientAddr = await resolveRecipientAddress(db, channel, payload.recipient as Record<string, unknown>)

    if (!conn) {
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
          nextRetryAt: null,
          lastError: `No active ${channel} connection — connect via Channels page first`,
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
        nextRetryAt: null,
        lastError: `No active ${channel} connection — connect via Channels page first`,
        createdAt: dts,
        updatedAt: dts,
      })
      continue
    }

    await db
      .insertInto('delivery')
      .values({
        id: deliveryId,
        userId,
        notificationId: notifId,
        channel,
        recipient: recipientAddr,
        status: 'queued',
        providerMessageId: null,
        error: null,
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: dts,
        updatedAt: dts,
      })
      .execute()

    const queueMsg: DeliveryQueueMessage = {
      deliveryId,
      notificationId: notifId,
      userId,
      channel,
    }
    await c.env.DELIVERY_Q.send(queueMsg)

    deliveries.push({
      id: deliveryId,
      userId,
      notificationId: notifId,
      channel,
      recipient: recipientAddr,
      status: 'queued',
      providerMessageId: null,
      error: null,
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: dts,
      updatedAt: dts,
    })
  }

  if (payload.idempotencyKey) {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString()
    await db
      .insertInto('idempotency_key')
      .values({
        userId,
        key: payload.idempotencyKey,
        notificationId: notifId,
        expiresAt,
        createdAt: ts,
      })
      .onConflict((oc) => oc.doNothing())
      .execute()
  }

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
