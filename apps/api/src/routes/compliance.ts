import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { Errors, validationHook } from '../lib/errors'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import type { AppEnv } from '../lib/types'

const SuppressionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  address: z.string(),
  reason: z.string(),
  createdAt: z.string(),
})

const ConsentEventDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  recipientId: z.string().nullable(),
  channel: z.string(),
  topicId: z.string().nullable(),
  event: z.string(),
  source: z.string(),
  actorNote: z.string().nullable(),
  createdAt: z.string(),
})

const SUPP_SORTABLE = { createdAt: 'createdAt', channel: 'channel' }
const SUPP_FILTERABLE = {
  channel: { column: 'channel', schema: z.string(), operator: 'eq' as const },
  reason: { column: 'reason', schema: z.string(), operator: 'eq' as const },
}
const SUPP_DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const CE_SORTABLE = { createdAt: 'createdAt' }
const CE_FILTERABLE = {
  channel: { column: 'channel', schema: z.string(), operator: 'eq' as const },
  recipientId: { column: 'recipientId', schema: z.string(), operator: 'eq' as const },
  event: { column: 'event', schema: z.string(), operator: 'eq' as const },
  source: { column: 'source', schema: z.string(), operator: 'eq' as const },
}
const CE_DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const listSuppressionsRoute = createRoute({
  method: 'get',
  path: '/suppressions',
  request: { query: listQuerySchema({ sortable: SUPP_SORTABLE, filterable: SUPP_FILTERABLE, defaultSort: SUPP_DEFAULT_SORT }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ data: z.array(SuppressionDtoSchema), nextCursor: z.string().nullable() }) } },
      description: 'Suppression list',
    },
  },
})

const addSuppressionRoute = createRoute({
  method: 'post',
  path: '/suppressions',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ channel: z.string().min(1), address: z.string().min(1), reason: z.enum(['hard_bounce', 'complaint', 'unsubscribe', 'manual']) }),
        },
      },
    },
  },
  responses: {
    201: { content: { 'application/json': { schema: SuppressionDtoSchema } }, description: 'Suppression added' },
  },
})

const deleteSuppressionRoute = createRoute({
  method: 'delete',
  path: '/suppressions/:id',
  responses: {
    204: { description: 'Removed' },
    404: { description: 'Not found' },
  },
})

const listConsentEventsRoute = createRoute({
  method: 'get',
  path: '/consent-events',
  request: { query: listQuerySchema({ sortable: CE_SORTABLE, filterable: CE_FILTERABLE, defaultSort: CE_DEFAULT_SORT }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ data: z.array(ConsentEventDtoSchema), nextCursor: z.string().nullable() }) } },
      description: 'Consent event log',
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listSuppressionsRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db.selectFrom('suppression').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, { sortable: SUPP_SORTABLE, filterable: SUPP_FILTERABLE, defaultSort: SUPP_DEFAULT_SORT })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof SuppressionDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(addSuppressionRoute, async (c) => {
  const { channel, address, reason } = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = new Date().toISOString()
  const id = crypto.randomUUID()

  await c.var.db
    .insertInto('suppression')
    .values({ id, userId, channel, address, reason, createdAt: ts })
    .onConflict((oc) => oc.doNothing())
    .execute()

  await c.var.db
    .insertInto('consent_event')
    .values({
      id: crypto.randomUUID(),
      userId,
      recipientId: null,
      channel,
      topicId: null,
      event: 'opt_out',
      source: 'api',
      actorNote: null,
      createdAt: ts,
    })
    .execute()

  const row = await c.var.db.selectFrom('suppression').where('userId', '=', userId).where('channel', '=', channel).where('address', '=', address).selectAll().executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof SuppressionDtoSchema>, 201)
})

router.openapi(deleteSuppressionRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const row = await c.var.db.selectFrom('suppression').where('id', '=', id).where('userId', '=', userId).select('id').executeTakeFirst()
  if (!row) throw Errors.notFound('Suppression')
  await c.var.db.deleteFrom('suppression').where('id', '=', id).where('userId', '=', userId).execute()
  return new Response(null, { status: 204 })
})

router.openapi(listConsentEventsRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db.selectFrom('consent_event').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, { sortable: CE_SORTABLE, filterable: CE_FILTERABLE, defaultSort: CE_DEFAULT_SORT })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof ConsentEventDtoSchema>[], nextCursor: page.nextCursor })
})

export default router
