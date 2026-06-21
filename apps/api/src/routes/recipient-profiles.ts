import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const HHMM = z.string().regex(/^\d{2}:\d{2}$/)

const PreferencesBodySchema = z.object({
  timezone: z.string().optional(),
  quietHoursStart: HHMM.optional(),
  quietHoursEnd: HHMM.optional(),
})

const PreferencesDtoSchema = z.object({
  userId: z.string(),
  timezone: z.string().nullable(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  updatedAt: z.string(),
})

const patchRoute = createRoute({
  method: 'patch',
  path: '/recipients/preferences',
  request: { body: { content: { 'application/json': { schema: PreferencesBodySchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: PreferencesDtoSchema } }, description: 'Updated preferences' },
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/recipients/preferences',
  responses: {
    200: { content: { 'application/json': { schema: PreferencesDtoSchema } }, description: 'Recipient preferences' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use('*', requireAuth)

router.openapi(getRoute, async (c) => {
  const userId = c.var.user!.id

  const profile = await c.var.db
    .selectFrom('recipient_profile')
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (!profile) {
    return c.json({ userId, timezone: null, quietHoursStart: null, quietHoursEnd: null, updatedAt: new Date().toISOString() })
  }

  return c.json(profile)
})

router.openapi(patchRoute, async (c) => {
  const userId = c.var.user!.id
  const body = c.req.valid('json')
  const ts = new Date().toISOString()

  const existing = await c.var.db
    .selectFrom('recipient_profile')
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()

  if (existing) {
    await c.var.db
      .updateTable('recipient_profile')
      .set({
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.quietHoursStart !== undefined && { quietHoursStart: body.quietHoursStart }),
        ...(body.quietHoursEnd !== undefined && { quietHoursEnd: body.quietHoursEnd }),
        updatedAt: ts,
      })
      .where('userId', '=', userId)
      .execute()
  } else {
    await c.var.db
      .insertInto('recipient_profile')
      .values({
        userId,
        timezone: body.timezone ?? null,
        quietHoursStart: body.quietHoursStart ?? null,
        quietHoursEnd: body.quietHoursEnd ?? null,
        updatedAt: ts,
      })
      .execute()
  }

  const profile = await c.var.db
    .selectFrom('recipient_profile')
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(profile)
})

export default router
