import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { Errors, validationHook } from '../lib/errors'
import { authInstance } from '../lib/auth'
import type { AppEnv } from '../lib/types'

const ApiKeyDtoSchema = z.object({
  id: z.string(),
  referenceId: z.string(),
  name: z.string().nullable(),
  start: z.string().nullable(),
  prefix: z.string().nullable(),
  enabled: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  lastRequest: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ApiKeyCreateResponseSchema = ApiKeyDtoSchema.extend({
  key: z.string(),
})

const CreateKeySchema = z.object({
  name: z.string().min(1).max(32),
  mode: z.enum(['live', 'test']).default('live'),
})

const ListResponseSchema = z.object({
  data: z.array(ApiKeyDtoSchema),
  nextCursor: z.null(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/keys',
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'API keys' },
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/keys',
  request: { body: { content: { 'application/json': { schema: CreateKeySchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: ApiKeyCreateResponseSchema } }, description: 'Created API key (plaintext shown once)' },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/keys/:id',
  responses: {
    204: { description: 'Revoked' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use('/keys', requireAuth)
router.use('/keys/:id', requireAuth)

function toISOString(d: Date | null | string | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

function mapKey(k: {
  id: string
  referenceId: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean
  metadata: Record<string, unknown> | null
  lastRequest: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: k.id,
    referenceId: k.referenceId,
    name: k.name,
    start: k.start,
    prefix: k.prefix,
    enabled: k.enabled,
    metadata: k.metadata,
    lastRequest: toISOString(k.lastRequest),
    createdAt: toISOString(k.createdAt)!,
    updatedAt: toISOString(k.updatedAt)!,
  }
}

router.openapi(listRoute, async (c) => {
  const result = await authInstance.api.listApiKeys({ headers: c.req.raw.headers })
  return c.json({ data: result.apiKeys.map(mapKey), nextCursor: null })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json')
  const result = await authInstance.api.createApiKey({
    body: {
      name: body.name,
      userId: c.var.user!.id,
      prefix: body.mode === 'test' ? 'rk_test_' : 'rk_live_',
      metadata: { mode: body.mode },
    },
  })
  return c.json({ ...mapKey(result), key: result.key }, 201)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const result = await authInstance.api.deleteApiKey({
    body: { keyId: id },
    headers: c.req.raw.headers,
  })
  if (!result.success) throw Errors.notFound('api_key')
  return c.body(null, 204)
})

export default router
