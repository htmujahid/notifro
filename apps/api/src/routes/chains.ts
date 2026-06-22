import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  FallbackChainDtoSchema,
  SORTABLE,
  createRoute_,
  deleteRoute,
  listRoute,
  patchRoute,
} from "./chains.contract"

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
      .selectFrom("fallback_chain")
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
      data: page.data as z.infer<typeof FallbackChainDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = newId()
    await c.var.db
      .insertInto("fallback_chain")
      .values({
        id,
        userId,
        name: body.name,
        steps: JSON.stringify(body.steps),
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
    const row = await c.var.db
      .selectFrom("fallback_chain")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof FallbackChainDtoSchema>, 201)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const existing = await c.var.db
      .selectFrom("fallback_chain")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("FallbackChain")
    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.name !== undefined) updates.name = body.name
    if (body.steps !== undefined) updates.steps = JSON.stringify(body.steps)
    await c.var.db
      .updateTable("fallback_chain")
      .set(updates)
      .where("id", "=", id)
      .execute()
    const row = await c.var.db
      .selectFrom("fallback_chain")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof FallbackChainDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const existing = await c.var.db
      .selectFrom("fallback_chain")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("FallbackChain")
    await c.var.db.deleteFrom("fallback_chain").where("id", "=", id).execute()
    return new Response(null, { status: 204 })
  })
