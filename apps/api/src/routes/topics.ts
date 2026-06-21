import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const SORTABLE = { name: 'name', createdAt: 'createdAt', updatedAt: 'updatedAt' }
const FILTERABLE = {
  q: { column: 'name', schema: z.string(), operator: 'like' as const },
  transactional: { column: 'transactional', schema: z.coerce.number().int().min(0).max(1), operator: 'eq' as const },
  defaultOptIn: { column: 'defaultOptIn', schema: z.coerce.number().int().min(0).max(1), operator: 'eq' as const },
}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const TopicDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultOptIn: z.number(),
  transactional: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateTopicSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, 'key must be lowercase alphanumeric, hyphens, or underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  defaultOptIn: z.boolean().optional().default(true),
  transactional: z.boolean().optional().default(false),
})

const PatchTopicSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  defaultOptIn: z.boolean().optional(),
  transactional: z.boolean().optional(),
})

const ListResponseSchema = z.object({
  data: z.array(TopicDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/topics',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated topics' },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/topics',
  request: { body: { content: { 'application/json': { schema: CreateTopicSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: TopicDtoSchema } }, description: 'Topic created' },
  },
})

const detailRoute = createRoute({
  method: 'get',
  path: '/topics/:id',
  responses: {
    200: { content: { 'application/json': { schema: TopicDtoSchema } }, description: 'Topic detail' },
  },
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/topics/:id',
  request: { body: { content: { 'application/json': { schema: PatchTopicSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: TopicDtoSchema } }, description: 'Topic updated' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/topics/:id',
  responses: {
    204: { description: 'Topic deleted' },
  },
})

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db.selectFrom('topic').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof TopicDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()
  const id = crypto.randomUUID()

  const existing = await c.var.db
    .selectFrom('topic')
    .where('userId', '=', userId)
    .where('key', '=', body.key)
    .select('id')
    .executeTakeFirst()

  if (existing) throw Errors.badRequest('Topic key already exists for this user')

  await c.var.db
    .insertInto('topic')
    .values({
      id,
      userId,
      key: body.key,
      name: body.name,
      description: body.description ?? null,
      defaultOptIn: body.defaultOptIn ? 1 : 0,
      transactional: body.transactional ? 1 : 0,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const topic = await c.var.db.selectFrom('topic').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(topic as z.infer<typeof TopicDtoSchema>, 201)
})

router.openapi(detailRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const topic = await c.var.db.selectFrom('topic').where('id', '=', id).where('userId', '=', userId).selectAll().executeTakeFirst()
  if (!topic) throw Errors.notFound('Topic')
  return c.json(topic as z.infer<typeof TopicDtoSchema>)
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()

  const topic = await c.var.db.selectFrom('topic').where('id', '=', id).where('userId', '=', userId).selectAll().executeTakeFirst()
  if (!topic) throw Errors.notFound('Topic')

  const updates: Record<string, unknown> = { updatedAt: ts }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.defaultOptIn !== undefined) updates.defaultOptIn = body.defaultOptIn ? 1 : 0
  if (body.transactional !== undefined) updates.transactional = body.transactional ? 1 : 0

  await c.var.db.updateTable('topic').set(updates).where('id', '=', id).execute()

  const updated = await c.var.db.selectFrom('topic').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(updated as z.infer<typeof TopicDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const topic = await c.var.db.selectFrom('topic').where('id', '=', id).where('userId', '=', userId).select('id').executeTakeFirst()
  if (!topic) throw Errors.notFound('Topic')
  await c.var.db.deleteFrom('topic').where('id', '=', id).execute()
  return c.body(null, 204)
})

export default router
