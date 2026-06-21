import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
})

const UnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
})

const VapidKeyResponseSchema = z.object({
  publicKey: z.string(),
})

const OkResponseSchema = z.object({ ok: z.boolean() })

const subscribeRoute = createRoute({
  method: "post",
  path: "/push/subscribe",
  request: {
    body: { content: { "application/json": { schema: SubscribeBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OkResponseSchema } },
      description: "Subscribed",
    },
  },
})

const unsubscribeRoute = createRoute({
  method: "post",
  path: "/push/unsubscribe",
  request: {
    body: {
      content: { "application/json": { schema: UnsubscribeBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OkResponseSchema } },
      description: "Unsubscribed",
    },
  },
})

const vapidKeyRoute = createRoute({
  method: "get",
  path: "/push/vapid-public-key",
  responses: {
    200: {
      content: { "application/json": { schema: VapidKeyResponseSchema } },
      description: "VAPID public key",
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
router.use("*", requireAuth)

router.openapi(subscribeRoute, async (c) => {
  const { endpoint, keys, userAgent } = c.req.valid("json")
  const userId = c.var.user!.id
  const { db } = c.var

  const existing = await db
    .selectFrom("push_subscription")
    .where("endpoint", "=", endpoint)
    .select("id")
    .executeTakeFirst()

  if (existing) {
    await db
      .updateTable("push_subscription")
      .set({
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
        updatedAt: now(),
      })
      .where("id", "=", existing.id)
      .execute()
  } else {
    await db
      .insertInto("push_subscription")
      .values({
        id: newId(),
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
        createdAt: now(),
        updatedAt: now(),
      })
      .execute()
  }

  return c.json({ ok: true })
})

router.openapi(unsubscribeRoute, async (c) => {
  const { endpoint } = c.req.valid("json")
  const userId = c.var.user!.id
  const { db } = c.var

  const sub = await db
    .selectFrom("push_subscription")
    .where("endpoint", "=", endpoint)
    .where("userId", "=", userId)
    .select("id")
    .executeTakeFirst()

  if (!sub) throw Errors.notFound("Push subscription")

  await db.deleteFrom("push_subscription").where("id", "=", sub.id).execute()

  return c.json({ ok: true })
})

router.openapi(vapidKeyRoute, async (c) => {
  const key = c.env.VAPID_PUBLIC_KEY ?? ""
  return c.json({ publicKey: key })
})

export default router
