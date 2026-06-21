import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const FrequencyCapSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  topicId: z.string().nullable(),
  maxCount: z.number(),
  windowSeconds: z.number(),
  overflowPolicy: z.string(),
  digestKey: z.string().nullable(),
  digestSchedule: z.string().nullable(),
  digestTemplateId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateBodySchema = z.object({
  channel: z.string().min(1),
  topicId: z.string().optional(),
  maxCount: z.number().int().min(1),
  windowSeconds: z.number().int().min(60),
  overflowPolicy: z.enum(['drop', 'defer', 'digest']).default('drop'),
  digestKey: z.string().optional(),
  digestSchedule: z.string().optional(),
  digestTemplateId: z.string().optional(),
})

const SORTABLE = { createdAt: 'createdAt' }
const FILTERABLE = {}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const listRoute = createRoute({
  method: 'get',
  path: '/frequency-caps',
  request: { query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }) },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: z.array(FrequencyCapSchema), nextCursor: z.string().nullable() }),
        },
      },
      description: 'Paginated frequency caps',
    },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/frequency-caps',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: FrequencyCapSchema } }, description: 'Created' },
  },
})

const updateRoute = createRoute({
  method: 'patch',
  path: '/frequency-caps/:id',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema.partial() } } } },
  responses: {
    200: { content: { 'application/json': { schema: FrequencyCapSchema } }, description: 'Updated' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/frequency-caps/:id',
  responses: {
    200: { content: { 'application/json': { schema: z.object({ id: z.string() }) } }, description: 'Deleted' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listRoute, async (c) => {
  const userId = c.var.user!.id
  const parsed = c.req.valid('query')
  const baseQuery = c.var.db.selectFrom('frequency_cap').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, { sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof FrequencyCapSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const userId = c.var.user!.id
  const body = c.req.valid('json')
  const ts = new Date().toISOString()
  const id = crypto.randomUUID()
  await c.var.db
    .insertInto('frequency_cap')
    .values({
      id,
      userId,
      channel: body.channel,
      topicId: body.topicId ?? null,
      maxCount: body.maxCount,
      windowSeconds: body.windowSeconds,
      overflowPolicy: body.overflowPolicy,
      digestKey: body.digestKey ?? null,
      digestSchedule: body.digestSchedule ?? null,
      digestTemplateId: body.digestTemplateId ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()
  const cap = await c.var.db.selectFrom('frequency_cap').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(cap as z.infer<typeof FrequencyCapSchema>)
})

router.openapi(updateRoute, async (c) => {
  const userId = c.var.user!.id
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const ts = new Date().toISOString()

  const existing = await c.var.db
    .selectFrom('frequency_cap')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('FrequencyCap')

  const updates: Record<string, unknown> = { updatedAt: ts }
  if (body.channel !== undefined) updates.channel = body.channel
  if (body.topicId !== undefined) updates.topicId = body.topicId
  if (body.maxCount !== undefined) updates.maxCount = body.maxCount
  if (body.windowSeconds !== undefined) updates.windowSeconds = body.windowSeconds
  if (body.overflowPolicy !== undefined) updates.overflowPolicy = body.overflowPolicy
  if (body.digestKey !== undefined) updates.digestKey = body.digestKey
  if (body.digestSchedule !== undefined) updates.digestSchedule = body.digestSchedule
  if (body.digestTemplateId !== undefined) updates.digestTemplateId = body.digestTemplateId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await c.var.db.updateTable('frequency_cap').set(updates as any).where('id', '=', id).where('userId', '=', userId).execute()
  const cap = await c.var.db.selectFrom('frequency_cap').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(cap as z.infer<typeof FrequencyCapSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const userId = c.var.user!.id
  const { id } = c.req.param()
  const existing = await c.var.db
    .selectFrom('frequency_cap')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('FrequencyCap')
  await c.var.db.deleteFrom('frequency_cap').where('id', '=', id).where('userId', '=', userId).execute()
  return c.json({ id })
})

export default router
