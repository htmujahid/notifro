import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  RateLimitRuleDtoSchema,
  SORTABLE,
  createRoute_,
  deleteRoute,
  listRoute,
  patchRoute,
} from "./rate-limits.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use("/rate-limits", requireAuth)
router.use("/rate-limits/:id", requireAuth)

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const db = c.var.db

    const baseQuery = db
      .selectFrom("rate_limit_rule")
      .where("userId", "=", userId)
      .selectAll()

    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    })

    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])

    return c.json({
      data: page.data as z.infer<typeof RateLimitRuleDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()
    const id = newId()

    await db
      .insertInto("rate_limit_rule")
      .values({
        id,
        userId,
        channel: body.channel,
        maxCount: body.maxCount,
        windowSeconds: body.windowSeconds,
        createdAt: ts,
        updatedAt: ts,
      })
      .onConflict((oc) =>
        oc.columns(["userId", "channel"]).doUpdateSet({
          maxCount: body.maxCount,
          windowSeconds: body.windowSeconds,
          updatedAt: ts,
        })
      )
      .execute()

    const row = await db
      .selectFrom("rate_limit_rule")
      .where("userId", "=", userId)
      .where("channel", "=", body.channel)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row, 201)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()

    const existing = await db
      .selectFrom("rate_limit_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("rate_limit_rule")

    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.maxCount !== undefined) updates.maxCount = body.maxCount
    if (body.windowSeconds !== undefined)
      updates.windowSeconds = body.windowSeconds

    await db
      .updateTable("rate_limit_rule")
      .set(updates)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    const updated = await db
      .selectFrom("rate_limit_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(updated)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db

    const existing = await db
      .selectFrom("rate_limit_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("rate_limit_rule")

    await db
      .deleteFrom("rate_limit_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    return c.body(null, 204)
  })
