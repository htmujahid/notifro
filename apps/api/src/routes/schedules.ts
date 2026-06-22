import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  ScheduledMessageDtoSchema,
  deleteRoute,
  listRoute,
} from "./schedules.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id

    const baseQuery = c.var.db
      .selectFrom("scheduled_message")
      .where("userId", "=", userId)
      .select([
        "id",
        "userId",
        "sendAt",
        "status",
        "timezone",
        "quietHoursStart",
        "quietHoursEnd",
        "deliveryWindowStart",
        "deliveryWindowEnd",
        "respectQuietHours",
        "notificationId",
        "recurringSendId",
        "createdAt",
        "updatedAt",
      ])

    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    })

    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])

    return c.json({
      data: page.data as z.infer<typeof ScheduledMessageDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const msg = await c.var.db
      .selectFrom("scheduled_message")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select(["id", "status"])
      .executeTakeFirst()

    if (!msg) throw Errors.notFound("Scheduled message")
    if (msg.status !== "pending")
      throw Errors.badRequest("Only pending messages can be cancelled")

    await c.var.db
      .updateTable("scheduled_message")
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    return c.json({ ok: true as const })
  })
