import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  TopicDtoSchema,
  createRoute_,
  deleteRoute,
  detailRoute,
  listRoute,
  patchRoute,
} from "./topics.contract"

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("topic")
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
      data: page.data as z.infer<typeof TopicDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = crypto.randomUUID()

    const existing = await c.var.db
      .selectFrom("topic")
      .where("userId", "=", userId)
      .where("key", "=", body.key)
      .select("id")
      .executeTakeFirst()

    if (existing)
      throw Errors.badRequest("Topic key already exists for this user")

    await c.var.db
      .insertInto("topic")
      .values({
        id,
        userId,
        key: body.key,
        name: body.name,
        description: body.description ?? null,
        defaultOptIn: body.defaultOptIn ? 1 : 0,
        transactional: body.transactional ? 1 : 0,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const topic = await c.var.db
      .selectFrom("topic")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(topic as z.infer<typeof TopicDtoSchema>, 201)
  })

  .openapi(detailRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const topic = await c.var.db
      .selectFrom("topic")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!topic) throw Errors.notFound("Topic")
    return c.json(topic as z.infer<typeof TopicDtoSchema>)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()

    const topic = await c.var.db
      .selectFrom("topic")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!topic) throw Errors.notFound("Topic")

    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.defaultOptIn !== undefined)
      updates.defaultOptIn = body.defaultOptIn ? 1 : 0
    if (body.transactional !== undefined)
      updates.transactional = body.transactional ? 1 : 0

    await c.var.db
      .updateTable("topic")
      .set(updates)
      .where("id", "=", id)
      .execute()

    const updated = await c.var.db
      .selectFrom("topic")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(updated as z.infer<typeof TopicDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const topic = await c.var.db
      .selectFrom("topic")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!topic) throw Errors.notFound("Topic")
    await c.var.db.deleteFrom("topic").where("id", "=", id).execute()
    return c.body(null, 204)
  })
