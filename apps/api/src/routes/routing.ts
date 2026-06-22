import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import { resolveRoute } from "../lib/routing"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

import {
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  RoutingRuleDtoSchema,
  createRoute_,
  deleteRoute,
  listRoute,
  patchRoute,
  resolveRoute_,
} from "./routing.contract"

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("routing_rule")
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
      data: page.data as z.infer<typeof RoutingRuleDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = newId()
    await c.var.db
      .insertInto("routing_rule")
      .values({
        id,
        userId,
        priority: body.priority,
        enabled: body.enabled !== false ? 1 : 0,
        match: JSON.stringify(body.match),
        targetChainId: body.targetChainId ?? null,
        targetChannel: body.targetChannel ?? null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
    const row = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof RoutingRuleDtoSchema>, 201)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const existing = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("RoutingRule")
    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0
    if (body.match !== undefined) updates.match = JSON.stringify(body.match)
    if (body.targetChainId !== undefined)
      updates.targetChainId = body.targetChainId
    if (body.targetChannel !== undefined)
      updates.targetChannel = body.targetChannel
    await c.var.db
      .updateTable("routing_rule")
      .set(updates)
      .where("id", "=", id)
      .execute()
    const row = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof RoutingRuleDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const existing = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("RoutingRule")
    await c.var.db.deleteFrom("routing_rule").where("id", "=", id).execute()
    return new Response(null, { status: 204 })
  })

  .openapi(resolveRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const result = await resolveRoute(c.var.db, userId, {
      priority: body.priority,
      messageType: body.messageType,
    })
    return c.json({ result })
  })
