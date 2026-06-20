import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { Errors, validationHook } from '../lib/errors'
import { encrypt, decrypt } from '../lib/crypto'
import { getAdapter } from '../channels/registry'
import { CHANNEL_TYPES, CONNECTION_STATUSES } from '../channels/types'
import type { AppEnv } from '../lib/types'
import type { ChannelType, ConnectionStatus } from '../channels/types'

const ChannelTypeEnum = z.enum(CHANNEL_TYPES as [ChannelType, ...ChannelType[]])
const StatusEnum = z.enum(CONNECTION_STATUSES as [ConnectionStatus, ...ConnectionStatus[]])

const SORTABLE = {
  createdAt: 'createdAt',
  name: 'name',
  channelType: 'type',
  status: 'status',
}

const FILTERABLE = {
  channelType: { column: 'type', schema: ChannelTypeEnum, operator: 'eq' as const },
  status: { column: 'status', schema: StatusEnum, operator: 'eq' as const },
}

const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const ConnectionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  name: z.string(),
  status: z.string(),
  config: z.string(),
  scopes: z.string(),
  health: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ListResponseSchema = z.object({
  data: z.array(ConnectionDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/connections',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated connections' },
  },
})

const CreateBodySchema = z.object({
  type: ChannelTypeEnum,
  name: z.string().min(1).max(255),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  credentials: z.record(z.string(), z.unknown()).optional(),
  scopes: z.array(z.string()).optional().default([]),
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/connections',
  request: { body: { content: { 'application/json': { schema: CreateBodySchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: ConnectionDtoSchema } }, description: 'Created connection' },
  },
})

const UpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  status: StatusEnum.optional(),
  scopes: z.array(z.string()).optional(),
})

const updateRoute = createRoute({
  method: 'patch',
  path: '/connections/:id',
  request: { body: { content: { 'application/json': { schema: UpdateBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: ConnectionDtoSchema } }, description: 'Updated connection' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/connections/:id',
  responses: {
    200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Deleted' },
  },
})

const HealthResultSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  checkedAt: z.string(),
})

const healthRoute = createRoute({
  method: 'post',
  path: '/connections/:id/health',
  responses: {
    200: { content: { 'application/json': { schema: HealthResultSchema } }, description: 'Health check result' },
  },
})

function redact(row: Record<string, unknown>) {
  const { credentials: _creds, ...rest } = row
  return rest
}

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
    .selectFrom('connection')
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
    data: page.data.map(redact) as z.infer<typeof ConnectionDtoSchema>[],
    nextCursor: page.nextCursor,
  })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const userId = c.var.user!.id
  const adapter = getAdapter(body.type)

  let validatedConfig = body.config
  if (adapter) {
    validatedConfig = adapter.validateConfig(body.config) as Record<string, unknown>
  }

  let encryptedCredentials: string | null = null
  if (body.credentials && Object.keys(body.credentials).length > 0) {
    encryptedCredentials = await encrypt(JSON.stringify(body.credentials), c.env.CONNECTION_ENC_KEY)
  }

  const status: ConnectionStatus = adapter ? 'active' : 'disabled'
  const id = newId()
  const ts = now()

  await c.var.db
    .insertInto('connection')
    .values({
      id,
      userId,
      type: body.type,
      name: body.name,
      status,
      config: JSON.stringify(validatedConfig),
      credentials: encryptedCredentials,
      scopes: JSON.stringify(body.scopes),
      health: null,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const row = await c.var.db
    .selectFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(redact(row as Record<string, unknown>) as z.infer<typeof ConnectionDtoSchema>, 201)
})

router.openapi(updateRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const userId = c.var.user!.id

  const existing = await c.var.db
    .selectFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Connection')

  const updates: Record<string, unknown> = { updatedAt: now() }

  if (body.name !== undefined) updates.name = body.name
  if (body.status !== undefined) updates.status = body.status
  if (body.scopes !== undefined) updates.scopes = JSON.stringify(body.scopes)

  if (body.config !== undefined) {
    const adapter = getAdapter(existing.type as ChannelType)
    updates.config = adapter
      ? JSON.stringify(adapter.validateConfig(body.config))
      : JSON.stringify(body.config)
  }

  if (body.credentials !== undefined) {
    if (Object.keys(body.credentials).length > 0) {
      let existingCreds: Record<string, unknown> = {}
      if (existing.credentials) {
        try {
          existingCreds = JSON.parse(await decrypt(existing.credentials, c.env.CONNECTION_ENC_KEY))
        } catch {
          existingCreds = {}
        }
      }
      const merged = { ...existingCreds, ...body.credentials }
      updates.credentials = await encrypt(JSON.stringify(merged), c.env.CONNECTION_ENC_KEY)
    }
  }

  await c.var.db
    .updateTable('connection')
    .set(updates)
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  const row = await c.var.db
    .selectFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(redact(row as Record<string, unknown>) as z.infer<typeof ConnectionDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id

  const existing = await c.var.db
    .selectFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .select('id')
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Connection')

  await c.var.db
    .deleteFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  return c.json({ ok: true })
})

router.openapi(healthRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id

  const existing = await c.var.db
    .selectFrom('connection')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!existing) throw Errors.notFound('Connection')

  const adapter = getAdapter(existing.type as ChannelType)
  if (!adapter?.healthCheck) {
    const result = { ok: true, message: 'No health check available for this channel type', checkedAt: now() }
    return c.json(result)
  }

  const result = await adapter.healthCheck(existing as any)

  await c.var.db
    .updateTable('connection')
    .set({
      health: JSON.stringify({ lastCheckedAt: result.checkedAt, ok: result.ok, message: result.message }),
      updatedAt: now(),
    })
    .where('id', '=', id)
    .where('userId', '=', userId)
    .execute()

  return c.json(result)
})

export default router
