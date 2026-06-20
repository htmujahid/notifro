import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'
import type { DeliveryQueueMessage } from '../queue/consumer'
import { CHANNEL_TYPES } from '../channels/types'

const CHANNEL_ENUM = CHANNEL_TYPES as [string, ...string[]]

const SORTABLE = {
  failedAt: 'failedAt',
  createdAt: 'createdAt',
  attempts: 'attempts',
}
const FILTERABLE = {
  channel: {
    column: 'channel',
    schema: z.enum(CHANNEL_ENUM),
    operator: 'eq' as const,
  },
  notificationId: {
    column: 'notificationId',
    schema: z.string(),
    operator: 'eq' as const,
  },
  reason: {
    column: 'reason',
    schema: z.string(),
    operator: 'eq' as const,
  },
  errorCode: {
    column: 'errorCode',
    schema: z.string(),
    operator: 'eq' as const,
  },
}
const DEFAULT_SORT = { key: 'failedAt', order: 'desc' as const }

const DeadLetterDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deliveryId: z.string(),
  notificationId: z.string(),
  channel: z.string(),
  reason: z.string(),
  errorCode: z.string().nullable(),
  error: z.string(),
  attempts: z.number(),
  failedAt: z.string(),
  createdAt: z.string(),
})

const listDeadRoute = createRoute({
  method: 'get',
  path: '/deliveries/dead',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(DeadLetterDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: 'Dead-letter entries',
    },
  },
})

const retryDeliveryRoute = createRoute({
  method: 'post',
  path: '/deliveries/:id/retry',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ queued: z.boolean() }) } },
      description: 'Delivery requeued',
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listDeadRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db
    .selectFrom('dead_letter')
    .where('userId', '=', userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({
    data: page.data as z.infer<typeof DeadLetterDtoSchema>[],
    nextCursor: page.nextCursor,
  })
})

router.openapi(retryDeliveryRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const db = c.var.db

  const delivery = await db
    .selectFrom('delivery')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!delivery) throw Errors.notFound('Delivery')
  if (delivery.status !== 'failed' && delivery.status !== 'dead') {
    throw Errors.validationError('Only failed or dead deliveries can be retried')
  }

  const ts = new Date().toISOString()

  await db
    .updateTable('delivery')
    .set({ status: 'queued', attempts: 0, lastError: null, nextRetryAt: null, updatedAt: ts })
    .where('id', '=', id)
    .execute()

  const msg: DeliveryQueueMessage = {
    deliveryId: id,
    notificationId: delivery.notificationId,
    userId,
    channel: delivery.channel,
  }
  await c.env.DELIVERY_Q.send(msg)

  return c.json({ queued: true })
})

export default router
