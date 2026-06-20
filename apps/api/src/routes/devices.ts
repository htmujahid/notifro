import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const RegisterBodySchema = z.object({
  platform: z.enum(['ios', 'android']),
  token: z.string().min(1),
})

const TokenParamSchema = z.object({
  token: z.string().min(1),
})

const OkResponseSchema = z.object({ ok: z.boolean() })

const registerRoute = createRoute({
  method: 'post',
  path: '/devices',
  request: { body: { content: { 'application/json': { schema: RegisterBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: OkResponseSchema } }, description: 'Device registered' },
  },
})

const deactivateRoute = createRoute({
  method: 'delete',
  path: '/devices/{token}',
  request: { params: TokenParamSchema },
  responses: {
    200: { content: { 'application/json': { schema: OkResponseSchema } }, description: 'Device deactivated' },
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

router.openapi(registerRoute, async (c) => {
  const { platform, token } = c.req.valid('json')
  const userId = c.var.user!.id
  const { db } = c.var
  const ts = now()

  const existing = await db
    .selectFrom('device_token')
    .where('token', '=', token)
    .select('id')
    .executeTakeFirst()

  if (existing) {
    await db
      .updateTable('device_token')
      .set({ userId, platform, active: 1, lastSeenAt: ts, updatedAt: ts })
      .where('id', '=', existing.id)
      .execute()
  } else {
    await db
      .insertInto('device_token')
      .values({
        id: newId(),
        userId,
        platform,
        token,
        active: 1,
        lastSeenAt: ts,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
  }

  return c.json({ ok: true })
})

router.openapi(deactivateRoute, async (c) => {
  const { token } = c.req.valid('param')
  const userId = c.var.user!.id
  const { db } = c.var

  await db
    .updateTable('device_token')
    .set({ active: 0, updatedAt: now() })
    .where('token', '=', token)
    .where('userId', '=', userId)
    .execute()

  return c.json({ ok: true })
})

export default router
