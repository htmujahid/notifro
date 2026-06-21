import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const SORTABLE = { updatedAt: 'updatedAt', createdAt: 'createdAt', email: 'email' }
const FILTERABLE = {
  q: { column: 'email', schema: z.string(), operator: 'like' as const },
}
const DEFAULT_SORT = { key: 'updatedAt', order: 'desc' as const }

const RecipientDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  externalId: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string().nullable(),
  timezone: z.string().nullable(),
  attributes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateRecipientSchema = z.object({
  externalId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

const PatchRecipientSchema = CreateRecipientSchema.partial()

const IdentifySchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

const ListResponseSchema = z.object({
  data: z.array(RecipientDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/recipients',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated recipients' },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/recipients',
  request: { body: { content: { 'application/json': { schema: CreateRecipientSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: RecipientDtoSchema } }, description: 'Created recipient' },
  },
})

const detailRoute = createRoute({
  method: 'get',
  path: '/recipients/:id',
  responses: {
    200: { content: { 'application/json': { schema: RecipientDtoSchema } }, description: 'Recipient detail' },
  },
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/recipients/:id',
  request: { body: { content: { 'application/json': { schema: PatchRecipientSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: RecipientDtoSchema } }, description: 'Updated recipient' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/recipients/:id',
  responses: { 204: { description: 'Deleted' } },
})

const identifyRoute = createRoute({
  method: 'post',
  path: '/recipients/identify',
  request: { body: { content: { 'application/json': { schema: IdentifySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: RecipientDtoSchema } }, description: 'Upserted recipient' },
  },
})

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const baseQuery = c.var.db.selectFrom('recipient').where('userId', '=', userId).selectAll()
  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })
  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({ data: page.data as z.infer<typeof RecipientDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()
  const id = newId()
  const locale = body.locale ?? inferLocale(c.req.raw.headers.get('accept-language'))
  await c.var.db
    .insertInto('recipient')
    .values({
      id,
      userId,
      externalId: body.externalId ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      locale: locale ?? null,
      timezone: body.timezone ?? null,
      attributes: body.attributes ? JSON.stringify(body.attributes) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()
  const row = await c.var.db.selectFrom('recipient').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof RecipientDtoSchema>, 201)
})

router.openapi(identifyRoute, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()
  const locale = body.locale ?? inferLocale(c.req.raw.headers.get('accept-language'))

  const existing = await c.var.db
    .selectFrom('recipient')
    .where('userId', '=', userId)
    .where('externalId', '=', body.externalId)
    .selectAll()
    .executeTakeFirst()

  if (existing) {
    const updates: Record<string, string | null> = { updatedAt: ts }
    if (body.email !== undefined) updates.email = body.email ?? null
    if (body.phone !== undefined) updates.phone = body.phone ?? null
    if (locale !== undefined) updates.locale = locale ?? null
    if (body.timezone !== undefined) updates.timezone = body.timezone ?? null
    if (body.attributes !== undefined) {
      const merged = { ...(existing.attributes ? (JSON.parse(existing.attributes) as Record<string, unknown>) : {}), ...body.attributes }
      updates.attributes = JSON.stringify(merged)
    }
    await c.var.db.updateTable('recipient').set(updates).where('id', '=', existing.id).execute()
    const row = await c.var.db.selectFrom('recipient').where('id', '=', existing.id).selectAll().executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof RecipientDtoSchema>)
  }

  const id = newId()
  await c.var.db
    .insertInto('recipient')
    .values({
      id,
      userId,
      externalId: body.externalId,
      email: body.email ?? null,
      phone: body.phone ?? null,
      locale: locale ?? null,
      timezone: body.timezone ?? null,
      attributes: body.attributes ? JSON.stringify(body.attributes) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()
  const row = await c.var.db.selectFrom('recipient').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof RecipientDtoSchema>)
})

router.openapi(detailRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const row = await c.var.db
    .selectFrom('recipient')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!row) throw Errors.notFound('Recipient')
  return c.json(row as z.infer<typeof RecipientDtoSchema>)
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()
  const existing = await c.var.db
    .selectFrom('recipient')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('Recipient')
  const updates: Record<string, string | null> = { updatedAt: ts }
  if (body.externalId !== undefined) updates.externalId = body.externalId ?? null
  if (body.email !== undefined) updates.email = body.email ?? null
  if (body.phone !== undefined) updates.phone = body.phone ?? null
  if (body.locale !== undefined) updates.locale = body.locale ?? null
  if (body.timezone !== undefined) updates.timezone = body.timezone ?? null
  if (body.attributes !== undefined) updates.attributes = body.attributes ? JSON.stringify(body.attributes) : null
  await c.var.db.updateTable('recipient').set(updates).where('id', '=', id).execute()
  const row = await c.var.db.selectFrom('recipient').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof RecipientDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const existing = await c.var.db
    .selectFrom('recipient')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select('id')
    .executeTakeFirst()
  if (!existing) throw Errors.notFound('Recipient')
  await c.var.db.deleteFrom('recipient').where('id', '=', id).execute()
  return new Response(null, { status: 204 })
})

function inferLocale(acceptLanguage: string | null): string | undefined {
  if (!acceptLanguage) return undefined
  const primary = acceptLanguage.split(',')[0]?.split(';')[0]?.trim()
  return primary || undefined
}

export default router
