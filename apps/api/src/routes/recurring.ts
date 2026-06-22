import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { nextCronRun, validateCronExpr } from "../scheduling/cron"

import {
  CreateBodySchema,
  DEFAULT_SORT,
  FILTERABLE,
  RUNS_DEFAULT_SORT,
  RUNS_FILTERABLE,
  RUNS_SORTABLE,
  SORTABLE,
  RecurringSendDtoSchema,
  RunDtoSchema,
  createRoute_,
  deleteRoute,
  listRoute,
  patchRoute,
  runsRoute,
} from "./recurring.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(createRoute_, async (c) => {
    const { payload, channels, cron, timezone } = c.req.valid("json")
    const userId = c.var.user!.id

    if (!validateCronExpr(cron))
      throw Errors.badRequest("Invalid cron expression")

    const ts = new Date().toISOString()
    let nextRunAt: string
    try {
      nextRunAt = nextCronRun(cron, new Date(), timezone).toISOString()
    } catch {
      throw Errors.badRequest(
        "Cron expression produces no valid run time within 1 year"
      )
    }

    const id = crypto.randomUUID()
    await c.var.db
      .insertInto("recurring_send")
      .values({
        id,
        userId,
        payload: JSON.stringify(payload),
        channels: JSON.stringify(channels),
        cron,
        timezone,
        nextRunAt,
        lastRunAt: null,
        enabled: 1,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const row = await c.var.db
      .selectFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row as z.infer<typeof RecurringSendDtoSchema>, 201)
  })

  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id

    const baseQuery = c.var.db
      .selectFrom("recurring_send")
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
      data: page.data as z.infer<typeof RecurringSendDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const body = c.req.valid("json")

    const existing = await c.var.db
      .selectFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Recurring send")

    const ts = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: ts }

    if (typeof body.enabled === "number") updates.enabled = body.enabled
    if (body.payload !== undefined)
      updates.payload = JSON.stringify(body.payload)
    if (body.channels !== undefined)
      updates.channels = JSON.stringify(body.channels)

    if (body.cron !== undefined || body.timezone !== undefined) {
      const newCron = body.cron ?? existing.cron
      const newTz = body.timezone ?? existing.timezone
      if (!validateCronExpr(newCron))
        throw Errors.badRequest("Invalid cron expression")
      try {
        updates.nextRunAt = nextCronRun(
          newCron,
          new Date(),
          newTz
        ).toISOString()
      } catch {
        throw Errors.badRequest(
          "Cron expression produces no valid run time within 1 year"
        )
      }
      if (body.cron !== undefined) updates.cron = body.cron
      if (body.timezone !== undefined) updates.timezone = body.timezone
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await c.var.db
      .updateTable("recurring_send")
      .set(updates as any)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    const row = await c.var.db
      .selectFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row as z.infer<typeof RecurringSendDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const existing = await c.var.db
      .selectFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select(["id"])
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Recurring send")

    await c.var.db
      .deleteFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    return c.json({ ok: true as const })
  })

  .openapi(runsRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const parsed = c.req.valid("query")

    const existing = await c.var.db
      .selectFrom("recurring_send")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select(["id"])
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Recurring send")

    const baseQuery = c.var.db
      .selectFrom("scheduled_message")
      .where("recurringSendId", "=", id)
      .where("userId", "=", userId)
      .select([
        "id",
        "userId",
        "sendAt",
        "status",
        "timezone",
        "notificationId",
        "recurringSendId",
        "createdAt",
        "updatedAt",
      ])

    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: RUNS_SORTABLE,
      filterable: RUNS_FILTERABLE,
      defaultSort: RUNS_DEFAULT_SORT,
    })

    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])

    return c.json({
      data: page.data as z.infer<typeof RunDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })
