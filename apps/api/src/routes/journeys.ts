import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { advanceJourneyRun } from "../lib/journey-engine"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  JourneyDtoSchema,
  JourneyRunDtoSchema,
  RUN_DEFAULT_SORT,
  RUN_SORTABLE,
  SORTABLE,
  activateRoute,
  createRoute_,
  deleteRoute,
  enrollRoute,
  getRoute,
  listRoute,
  listRunsRoute,
  patchRoute,
} from "./journeys.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const parsed = c.req.valid("query")
    const baseQuery = db
      .selectFrom("journey")
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
      data: page.data as z.infer<typeof JourneyDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const { db } = c.var
    const userId = c.var.user!.id
    const ts = new Date().toISOString()
    const id = crypto.randomUUID()
    await db
      .insertInto("journey")
      .values({
        id,
        userId,
        name: body.name,
        status: "draft",
        trigger: body.trigger ? JSON.stringify(body.trigger) : null,
        steps: JSON.stringify(body.steps),
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
    const row = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row, 201)
  })

  .openapi(getRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const row = await db
      .selectFrom("journey")
      .where("id", "=", c.req.param("id"))
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!row) throw Errors.notFound("Journey")
    return c.json(row)
  })

  .openapi(patchRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const id = c.req.param("id")
    const body = c.req.valid("json")
    const existing = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Journey")
    if (existing.status === "active" && body.status === undefined) {
      throw Errors.badRequest("Cannot edit an active journey; pause it first")
    }
    const ts = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.name !== undefined) updates.name = body.name
    if ("trigger" in body)
      updates.trigger =
        body.trigger !== null && body.trigger !== undefined
          ? JSON.stringify(body.trigger)
          : null
    if (body.steps !== undefined) updates.steps = JSON.stringify(body.steps)
    if (body.status !== undefined) updates.status = body.status
    await db.updateTable("journey").set(updates).where("id", "=", id).execute()
    const row = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row)
  })

  .openapi(deleteRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const id = c.req.param("id")
    const existing = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Journey")
    if (existing.status === "active")
      throw Errors.badRequest("Cannot delete an active journey; pause it first")
    await db.deleteFrom("journey").where("id", "=", id).execute()
    return new Response(null, { status: 204 })
  })

  .openapi(activateRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const id = c.req.param("id")
    const existing = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Journey")
    const ts = new Date().toISOString()
    await db
      .updateTable("journey")
      .set({ status: "active", updatedAt: ts })
      .where("id", "=", id)
      .execute()
    const row = await db
      .selectFrom("journey")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row)
  })

  .openapi(listRunsRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const journeyId = c.req.param("id")
    const journey = await db
      .selectFrom("journey")
      .where("id", "=", journeyId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!journey) throw Errors.notFound("Journey")
    const parsed = c.req.valid("query")
    const baseQuery = db
      .selectFrom("journey_run")
      .where("journeyId", "=", journeyId)
      .where("userId", "=", userId)
      .selectAll()
    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: RUN_SORTABLE,
      filterable: {},
      defaultSort: RUN_DEFAULT_SORT,
    })
    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])
    return c.json({
      data: page.data as z.infer<typeof JourneyRunDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(enrollRoute, async (c) => {
    const { db } = c.var
    const userId = c.var.user!.id
    const journeyId = c.req.param("id")
    const { recipientId } = c.req.valid("json")
    const journey = await db
      .selectFrom("journey")
      .where("id", "=", journeyId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!journey) throw Errors.notFound("Journey")

    const recipient = await db
      .selectFrom("recipient")
      .where("id", "=", recipientId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!recipient) throw Errors.notFound("Recipient")

    const steps = JSON.parse(journey.steps) as Record<string, unknown>
    const firstStepId = Object.keys(steps)[0]
    if (!firstStepId) throw Errors.badRequest("Journey has no steps")

    const ts = new Date().toISOString()
    const runId = crypto.randomUUID()

    try {
      await db
        .insertInto("journey_run")
        .values({
          id: runId,
          userId,
          journeyId,
          recipientId,
          status: "active",
          currentStepId: firstStepId,
          nextResumeAt: null,
          context: JSON.stringify(
            recipient.attributes
              ? JSON.parse(recipient.attributes as string)
              : {}
          ),
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()
    } catch {
      throw Errors.badRequest("Recipient already enrolled in this journey")
    }

    const run = await db
      .selectFrom("journey_run")
      .where("id", "=", runId)
      .selectAll()
      .executeTakeFirstOrThrow()

    await advanceJourneyRun(run, db, c.env)

    const updated = await db
      .selectFrom("journey_run")
      .where("id", "=", runId)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(updated, 201)
  })
