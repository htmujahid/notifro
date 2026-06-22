import { OpenAPIHono } from "@hono/zod-openapi"

import { validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { getRoute, patchRoute } from "./recipient-profiles.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(getRoute, async (c) => {
    const userId = c.var.user!.id

    const profile = await c.var.db
      .selectFrom("recipient_profile")
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!profile) {
      return c.json({
        userId,
        timezone: null,
        quietHoursStart: null,
        quietHoursEnd: null,
        updatedAt: new Date().toISOString(),
      })
    }

    return c.json(profile)
  })

  .openapi(patchRoute, async (c) => {
    const userId = c.var.user!.id
    const body = c.req.valid("json")
    const ts = new Date().toISOString()

    const existing = await c.var.db
      .selectFrom("recipient_profile")
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (existing) {
      await c.var.db
        .updateTable("recipient_profile")
        .set({
          ...(body.timezone !== undefined && { timezone: body.timezone }),
          ...(body.quietHoursStart !== undefined && {
            quietHoursStart: body.quietHoursStart,
          }),
          ...(body.quietHoursEnd !== undefined && {
            quietHoursEnd: body.quietHoursEnd,
          }),
          updatedAt: ts,
        })
        .where("userId", "=", userId)
        .execute()
    } else {
      await c.var.db
        .insertInto("recipient_profile")
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
      .selectFrom("recipient_profile")
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(profile)
  })
