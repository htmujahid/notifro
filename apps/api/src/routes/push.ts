import { OpenAPIHono } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  subscribeRoute,
  unsubscribeRoute,
  vapidKeyRoute,
} from "./push.contract"

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(subscribeRoute, async (c) => {
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

  .openapi(unsubscribeRoute, async (c) => {
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

  .openapi(vapidKeyRoute, async (c) => {
    const key = c.env.VAPID_PUBLIC_KEY ?? ""
    return c.json({ publicKey: key })
  })
