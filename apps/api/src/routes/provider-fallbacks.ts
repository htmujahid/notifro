import { OpenAPIHono } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { createRoute_, deleteRoute, listRoute } from "./provider-fallbacks.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const rows = await db
      .selectFrom("provider_fallback")
      .where("userId", "=", userId)
      .selectAll()
      .orderBy("createdAt", "desc")
      .execute()
    return c.json({ data: rows, nextCursor: null })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const { db } = c.var
    const userId = c.var.user!.id
    const ts = new Date().toISOString()
    const id = crypto.randomUUID()
    await db
      .insertInto("provider_fallback")
      .values({
        id,
        userId,
        channel: body.channel,
        primaryConnectionId: body.primaryConnectionId,
        fallbackConnectionId: body.fallbackConnectionId,
        createdAt: ts,
      })
      .onConflict((oc) =>
        oc.columns(["userId", "channel"]).doUpdateSet({
          primaryConnectionId: body.primaryConnectionId,
          fallbackConnectionId: body.fallbackConnectionId,
        })
      )
      .execute()
    const row = await db
      .selectFrom("provider_fallback")
      .where("userId", "=", userId)
      .where("channel", "=", body.channel)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row, 201)
  })

  .openapi(deleteRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const id = c.req.param("id")
    const existing = await db
      .selectFrom("provider_fallback")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Provider fallback")
    await db.deleteFrom("provider_fallback").where("id", "=", id).execute()
    return new Response(null, { status: 204 })
  })
