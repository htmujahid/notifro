import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const DigestRuleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  topicId: z.string().nullable(),
  digestKey: z.string(),
  schedule: z.string(),
  templateId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateBodySchema = z.object({
  channel: z.string().min(1),
  topicId: z.string().optional(),
  digestKey: z.string().min(1),
  schedule: z.enum(['hourly', 'daily', 'weekly']),
  templateId: z.string().optional(),
})

const SORTABLE = { createdAt: 'createdAt' }
const FILTERABLE = {}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const listRoute = createRoute({
  method: 'get',
  path: '/digest-rules',
  request: { query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }) },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: z.array(DigestRuleSchema), nextCursor: z.string().nullable() }),
        },
      },
      description: 'Paginated digest rules',
    },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/digest-rules',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: DigestRuleSchema } }, description: 'Created' },
  },
})

const updateRoute = createRoute({
  method: 'patch',
  path: '/digest-rules/:id',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema.partial() } } } },
  responses: {
    200: { content: { 'application/json': { schema: DigestRuleSchema } }, description: 'Updated' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/digest-rules/:id',
  responses: {
    200: { content: { 'application/json': { schema: z.object({ id: z.string() }) } }, description: 'Deleted' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listRoute, async (c) => {
  const userId = c.var.user!.id
  const parsed = c.req.valid('query')
  const baseQuery = c.var.db.selectFrom('digest_rule').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, { sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof DigestRuleSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const userId = c.var.user!.id
  const body = c.req.valid('json')
  const ts = new Date().toISOString()
  const id = crypto.randomUUID()
  await c.var.db
    .insertInto('digest_rule')
    .values({
      id,
      userId,
      channel: body.channel,
      topicId: body.topicId ?? null,
      digestKey: body.digestKey,
      schedule: body.schedule,
      templateId: body.templateId ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .onConflict((oc) => oc.doNothing())
    .execute()
  const rule = await c.var.db.selectFrom('digest_rule').where('id', '=', id).selectAll().executeTakeFirst()
  if (!rule) throw Errors.badRequest('A digest rule for this channel and topic already exists')
  return c.json(rule as z.infer<typeof DigestRuleSchema>)
})

router.openapi(updateRoute, async (c) => {
  const userId = c.var.user!.id
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const ts = new Date().toISOString()

  const existing = await c.var.db
    .selectFrom('digest_rule')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('DigestRule')

  const updates: Record<string, unknown> = { updatedAt: ts }
  if (body.channel !== undefined) updates.channel = body.channel
  if (body.topicId !== undefined) updates.topicId = body.topicId
  if (body.digestKey !== undefined) updates.digestKey = body.digestKey
  if (body.schedule !== undefined) updates.schedule = body.schedule
  if (body.templateId !== undefined) updates.templateId = body.templateId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await c.var.db.updateTable('digest_rule').set(updates as any).where('id', '=', id).where('userId', '=', userId).execute()
  const rule = await c.var.db.selectFrom('digest_rule').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(rule as z.infer<typeof DigestRuleSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const userId = c.var.user!.id
  const { id } = c.req.param()
  const existing = await c.var.db
    .selectFrom('digest_rule')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('DigestRule')
  await c.var.db.deleteFrom('digest_rule').where('id', '=', id).where('userId', '=', userId).execute()
  return c.json({ id })
})

export default router
