import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { renderTemplate } from '../lib/render-template'
import type { AppEnv } from '../lib/types'

const SORTABLE = { updatedAt: 'updatedAt', name: 'name', createdAt: 'createdAt' }
const FILTERABLE = {
  q: { column: 'name', schema: z.string(), operator: 'like' as const },
  defaultLocale: { column: 'defaultLocale', schema: z.string(), operator: 'eq' as const },
}
const DEFAULT_SORT = { key: 'updatedAt', order: 'desc' as const }

const VariableDefSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']).default('string'),
  required: z.boolean().optional().default(false),
})

const TemplateDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  defaultLocale: z.string(),
  content: z.string(),
  variables: z.string().nullable(),
  localeStrings: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/, 'slug must be lowercase alphanumeric with - or _'),
  description: z.string().optional(),
  defaultLocale: z.string().default('en'),
  content: z.record(z.string(), z.unknown()),
  variables: z.array(VariableDefSchema).optional(),
  localeStrings: z.record(z.string(), z.record(z.string(), z.string())).optional(),
})

const PatchTemplateSchema = CreateTemplateSchema.partial()

const RenderRequestSchema = z.object({
  data: z.record(z.string(), z.unknown()).default({}),
  locale: z.string().optional(),
})

const ListResponseSchema = z.object({
  data: z.array(TemplateDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/templates',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated templates' },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/templates',
  request: { body: { content: { 'application/json': { schema: CreateTemplateSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: TemplateDtoSchema } }, description: 'Created template' },
  },
})

const detailRoute = createRoute({
  method: 'get',
  path: '/templates/:id',
  responses: {
    200: { content: { 'application/json': { schema: TemplateDtoSchema } }, description: 'Template' },
  },
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/templates/:id',
  request: { body: { content: { 'application/json': { schema: PatchTemplateSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: TemplateDtoSchema } }, description: 'Updated template' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/templates/:id',
  responses: {
    204: { description: 'Deleted' },
  },
})

const renderRoute = createRoute({
  method: 'post',
  path: '/templates/:id/render',
  request: { body: { content: { 'application/json': { schema: RenderRequestSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ content: z.record(z.string(), z.unknown()), templateId: z.string(), locale: z.string() }) } },
      description: 'Rendered content',
    },
  },
})

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id

  const baseQuery = c.var.db
    .selectFrom('template')
    .where('userId', '=', userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof TemplateDtoSchema>[], nextCursor: page.nextCursor })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()
  const id = newId()

  const existing = await c.var.db
    .selectFrom('template')
    .where('userId', '=', userId)
    .where('slug', '=', body.slug)
    .select('id')
    .executeTakeFirst()

  if (existing) throw Errors.badRequest(`Template slug '${body.slug}' already exists`)

  await c.var.db
    .insertInto('template')
    .values({
      id,
      userId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      defaultLocale: body.defaultLocale,
      content: JSON.stringify(body.content),
      variables: body.variables ? JSON.stringify(body.variables) : null,
      localeStrings: body.localeStrings ? JSON.stringify(body.localeStrings) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const row = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row as z.infer<typeof TemplateDtoSchema>, 201)
})

router.openapi(detailRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id

  const row = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!row) throw Errors.notFound('Template')
  return c.json(row as z.infer<typeof TemplateDtoSchema>)
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const ts = now()

  const existing = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Template')

  if (body.slug && body.slug !== existing.slug) {
    const conflict = await c.var.db
      .selectFrom('template')
      .where('userId', '=', userId)
      .where('slug', '=', body.slug)
      .select('id')
      .executeTakeFirst()
    if (conflict) throw Errors.badRequest(`Template slug '${body.slug}' already exists`)
  }

  const maxVersionRow = await c.var.db
    .selectFrom('template_version')
    .where('templateId', '=', id)
    .select(c.var.db.fn.max('version').as('maxVersion'))
    .executeTakeFirst()
  const nextVersion = ((maxVersionRow?.maxVersion as number | null) ?? 0) + 1

  await c.var.db
    .insertInto('template_version')
    .values({
      id: newId(),
      userId,
      templateId: id,
      version: nextVersion,
      content: existing.content,
      localeStrings: existing.localeStrings,
      variables: existing.variables,
      createdAt: ts,
    })
    .execute()

  const updates: Record<string, unknown> = { updatedAt: ts }
  if (body.name !== undefined) updates.name = body.name
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.description !== undefined) updates.description = body.description ?? null
  if (body.defaultLocale !== undefined) updates.defaultLocale = body.defaultLocale
  if (body.content !== undefined) updates.content = JSON.stringify(body.content)
  if (body.variables !== undefined) updates.variables = body.variables ? JSON.stringify(body.variables) : null
  if (body.localeStrings !== undefined) updates.localeStrings = body.localeStrings ? JSON.stringify(body.localeStrings) : null

  await c.var.db
    .updateTable('template')
    .set(updates)
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  const row = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row as z.infer<typeof TemplateDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id

  const existing = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select('id')
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Template')

  await c.var.db
    .deleteFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  return new Response(null, { status: 204 })
})

router.openapi(renderRoute, async (c) => {
  const { id } = c.req.param()
  const { data, locale } = c.req.valid('json')
  const userId = c.var.user!.id

  const template = await c.var.db
    .selectFrom('template')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!template) throw Errors.notFound('Template')

  const content = renderTemplate(template, data, locale)

  const resolvedLocale = locale ?? template.defaultLocale

  return c.json({ content, templateId: id, locale: resolvedLocale })
})

export default router
