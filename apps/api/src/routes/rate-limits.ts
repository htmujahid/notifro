import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const SORTABLE = { createdAt: 'createdAt', channel: 'channel' }
const FILTERABLE = {}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const RateLimitRuleDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  maxCount: z.number(),
  windowSeconds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateRateLimitRuleSchema = z.object({
  channel: z.string().min(1),
  maxCount: z.number().int().min(1),
  windowSeconds: z.number().int().min(1),
})

const PatchRateLimitRuleSchema = z.object({
  maxCount: z.number().int().min(1).optional(),
  windowSeconds: z.number().int().min(1).optional(),
})

const ListResponseSchema = z.object({
  data: z.array(RateLimitRuleDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/rate-limits',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated rate limit rules' },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/rate-limits',
  request: { body: { content: { 'application/json': { schema: CreateRateLimitRuleSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: RateLimitRuleDtoSchema } }, description: 'Created or updated rate limit rule' },
  },
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/rate-limits/:id',
  request: { body: { content: { 'application/json': { schema: PatchRateLimitRuleSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: RateLimitRuleDtoSchema } }, description: 'Updated rate limit rule' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/rate-limits/:id',
  responses: {
    204: { description: 'Deleted' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use('/rate-limits', requireAuth)
router.use('/rate-limits/:id', requireAuth)

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const db = c.var.db

  const baseQuery = db
    .selectFrom('rate_limit_rule')
    .where('userId', '=', userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof RateLimitRuleDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const db = c.var.db
  const ts = now()
  const id = newId()

  await db
    .insertInto('rate_limit_rule')
    .values({ id, userId, channel: body.channel, maxCount: body.maxCount, windowSeconds: body.windowSeconds, createdAt: ts, updatedAt: ts })
    .onConflict((oc) =>
      oc.columns(['userId', 'channel']).doUpdateSet({
        maxCount: body.maxCount,
        windowSeconds: body.windowSeconds,
        updatedAt: ts,
      }),
    )
    .execute()

  const row = await db
    .selectFrom('rate_limit_rule')
    .where('userId', '=', userId)
    .where('channel', '=', body.channel)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row, 201)
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const db = c.var.db
  const ts = now()

  const existing = await db
    .selectFrom('rate_limit_rule')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('rate_limit_rule')

  const updates: Record<string, unknown> = { updatedAt: ts }
  if (body.maxCount !== undefined) updates.maxCount = body.maxCount
  if (body.windowSeconds !== undefined) updates.windowSeconds = body.windowSeconds

  await db.updateTable('rate_limit_rule').set(updates).where('id', '=', id).where('userId', '=', userId).execute()

  const updated = await db
    .selectFrom('rate_limit_rule')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(updated)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const db = c.var.db

  const existing = await db
    .selectFrom('rate_limit_rule')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select('id')
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('rate_limit_rule')

  await db.deleteFrom('rate_limit_rule').where('id', '=', id).where('userId', '=', userId).execute()

  return c.body(null, 204)
})

export default router
