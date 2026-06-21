import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { nextCronRun, validateCronExpr } from '../scheduling/cron'
import type { AppEnv } from '../lib/types'

const RecurringSendDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  cron: z.string(),
  timezone: z.string(),
  channels: z.string(),
  nextRunAt: z.string(),
  lastRunAt: z.string().nullable(),
  enabled: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const RunDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sendAt: z.string(),
  status: z.string(),
  timezone: z.string().nullable(),
  notificationId: z.string().nullable(),
  recurringSendId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateBodySchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  channels: z.array(z.string()).min(1),
  cron: z.string(),
  timezone: z.string().optional().default('UTC'),
})

const PatchBodySchema = z.object({
  enabled: z.number().int().min(0).max(1).optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.string()).optional(),
})

const SORTABLE = { createdAt: 'createdAt', nextRunAt: 'nextRunAt' }
const FILTERABLE = {
  enabled: { column: 'enabled', schema: z.coerce.number().int().min(0).max(1), operator: 'eq' as const },
  channel: { column: 'channels', schema: z.string(), operator: 'like' as const },
}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const RUNS_SORTABLE = { sendAt: 'sendAt' }
const RUNS_FILTERABLE = {
  status: { column: 'status', schema: z.enum(['pending', 'enqueued', 'cancelled']), operator: 'eq' as const },
  from: { column: 'sendAt', schema: z.string(), operator: 'gte' as const },
  to: { column: 'sendAt', schema: z.string(), operator: 'lte' as const },
}
const RUNS_DEFAULT_SORT = { key: 'sendAt', order: 'desc' as const }

const ListResponseSchema = z.object({ data: z.array(RecurringSendDtoSchema), nextCursor: z.string().nullable() })
const RunsResponseSchema = z.object({ data: z.array(RunDtoSchema), nextCursor: z.string().nullable() })

const createRoute_ = createRoute({
  method: 'post',
  path: '/recurring',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: RecurringSendDtoSchema } }, description: 'Created' },
  },
})

const listRoute = createRoute({
  method: 'get',
  path: '/recurring',
  request: { query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }) },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated recurring sends' },
  },
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/recurring/:id',
  request: { body: { content: { 'application/json': { schema: PatchBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: RecurringSendDtoSchema } }, description: 'Updated' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/recurring/:id',
  responses: {
    200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } }, description: 'Deleted' },
  },
})

const runsRoute = createRoute({
  method: 'get',
  path: '/recurring/:id/runs',
  request: { query: listQuerySchema({ sortable: RUNS_SORTABLE, filterable: RUNS_FILTERABLE, defaultSort: RUNS_DEFAULT_SORT }) },
  responses: {
    200: { content: { 'application/json': { schema: RunsResponseSchema } }, description: 'Run history' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(createRoute_, async (c) => {
  const { payload, channels, cron, timezone } = c.req.valid('json')
  const userId = c.var.user!.id

  if (!validateCronExpr(cron)) throw Errors.badRequest('Invalid cron expression')

  const ts = new Date().toISOString()
  let nextRunAt: string
  try {
    nextRunAt = nextCronRun(cron, new Date(), timezone).toISOString()
  } catch {
    throw Errors.badRequest('Cron expression produces no valid run time within 1 year')
  }

  const id = crypto.randomUUID()
  await c.var.db
    .insertInto('recurring_send')
    .values({
      id,
      userId,
      payload: JSON.stringify(payload),
      channels: JSON.stringify(channels),
      cron,
      timezone,
      nextRunAt,
      lastRunAt: null,
      enabled: 1,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const row = await c.var.db
    .selectFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row as z.infer<typeof RecurringSendDtoSchema>, 201)
})

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id

  const baseQuery = c.var.db
    .selectFrom('recurring_send')
    .where('userId', '=', userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof RecurringSendDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const body = c.req.valid('json')

  const existing = await c.var.db
    .selectFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Recurring send')

  const ts = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: ts }

  if (typeof body.enabled === 'number') updates.enabled = body.enabled
  if (body.payload !== undefined) updates.payload = JSON.stringify(body.payload)
  if (body.channels !== undefined) updates.channels = JSON.stringify(body.channels)

  if (body.cron !== undefined || body.timezone !== undefined) {
    const newCron = body.cron ?? existing.cron
    const newTz = body.timezone ?? existing.timezone
    if (!validateCronExpr(newCron)) throw Errors.badRequest('Invalid cron expression')
    try {
      updates.nextRunAt = nextCronRun(newCron, new Date(), newTz).toISOString()
    } catch {
      throw Errors.badRequest('Cron expression produces no valid run time within 1 year')
    }
    if (body.cron !== undefined) updates.cron = body.cron
    if (body.timezone !== undefined) updates.timezone = body.timezone
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await c.var.db
    .updateTable('recurring_send')
    .set(updates as any)
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  const row = await c.var.db
    .selectFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row as z.infer<typeof RecurringSendDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id

  const existing = await c.var.db
    .selectFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select(['id'])
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Recurring send')

  await c.var.db
    .deleteFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  return c.json({ ok: true as const })
})

router.openapi(runsRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const parsed = c.req.valid('query')

  const existing = await c.var.db
    .selectFrom('recurring_send')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select(['id'])
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Recurring send')

  const baseQuery = c.var.db
    .selectFrom('scheduled_message')
    .where('recurringSendId', '=', id)
    .where('userId', '=', userId)
    .select(['id', 'userId', 'sendAt', 'status', 'timezone', 'notificationId', 'recurringSendId', 'createdAt', 'updatedAt'])

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: RUNS_SORTABLE,
    filterable: RUNS_FILTERABLE,
    defaultSort: RUNS_DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof RunDtoSchema>[], nextCursor: page.nextCursor })
})

export default router
