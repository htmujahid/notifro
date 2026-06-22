import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  InboxMessageDtoSchema,
  listRoute,
  markAllReadRoute,
  markReadRoute,
  unreadCountRoute,
} from "./inbox.contract"

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const { limit = 20, cursor, filter } = c.req.valid("query")
    const userId = c.var.user!.id
    const db = c.var.db

    let qb = db
      .selectFrom("inbox_message")
      .where("userId", "=", userId)
      .selectAll()

    if (filter === "unread") {
      qb = qb.where("readAt", "is", null)
    } else if (filter === "read") {
      qb = qb.where("readAt", "is not", null)
    }

    if (cursor) {
      try {
        const { createdAt, id } = JSON.parse(atob(cursor)) as {
          createdAt: string
          id: string
        }
        qb = qb.where((eb) =>
          eb.or([
            eb("createdAt", "<", createdAt),
            eb.and([eb("createdAt", "=", createdAt), eb("id", "<", id)]),
          ])
        )
      } catch {
        throw Errors.badRequest("Invalid cursor")
      }
    }

    const rows = await qb
      .orderBy("createdAt", "desc")
      .orderBy("id", "desc")
      .limit(limit + 1)
      .execute()

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const last = data[data.length - 1]
    const nextCursor =
      hasMore && last
        ? btoa(JSON.stringify({ createdAt: last.createdAt, id: last.id }))
        : null

    return c.json({
      data: data as z.infer<typeof InboxMessageDtoSchema>[],
      nextCursor,
    })
  })

  .openapi(unreadCountRoute, async (c) => {
    const userId = c.var.user!.id
    const result = await c.var.db
      .selectFrom("inbox_message")
      .where("userId", "=", userId)
      .where("readAt", "is", null)
      .select(c.var.db.fn.countAll<number>().as("n"))
      .executeTakeFirstOrThrow()
    return c.json({ count: Number(result.n) })
  })

  .openapi(markReadRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db

    const msg = await db
      .selectFrom("inbox_message")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!msg) throw Errors.notFound("Inbox message")

    const ts = now()
    await db
      .updateTable("inbox_message")
      .set({ readAt: ts, seenAt: msg.seenAt ?? ts, updatedAt: ts })
      .where("id", "=", id)
      .execute()

    const updated = await db
      .selectFrom("inbox_message")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(updated as z.infer<typeof InboxMessageDtoSchema>)
  })

  .openapi(markAllReadRoute, async (c) => {
    const userId = c.var.user!.id
    const ts = now()
    const result = await c.var.db
      .updateTable("inbox_message")
      .set({ readAt: ts, seenAt: ts, updatedAt: ts })
      .where("userId", "=", userId)
      .where("readAt", "is", null)
      .executeTakeFirst()

    return c.json({ updated: Number(result.numUpdatedRows ?? 0) })
  })
