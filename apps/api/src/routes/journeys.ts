import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { advanceJourneyRun } from "../lib/journey-engine"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = { createdAt: "createdAt", name: "name" }
const FILTERABLE = {}
const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

const RUN_SORTABLE = { createdAt: "createdAt", updatedAt: "updatedAt" }
const RUN_DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

const JourneyDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.string(),
  trigger: z.string().nullable(),
  steps: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const JourneyRunDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  journeyId: z.string(),
  recipientId: z.string(),
  status: z.string(),
  currentStepId: z.string(),
  nextResumeAt: z.string().nullable(),
  context: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ListJourneysResponseSchema = z.object({
  data: z.array(JourneyDtoSchema),
  nextCursor: z.string().nullable(),
})

const ListRunsResponseSchema = z.object({
  data: z.array(JourneyRunDtoSchema),
  nextCursor: z.string().nullable(),
})

const CreateJourneySchema = z.object({
  name: z.string().min(1),
  trigger: z
    .union([
      z.object({
        type: z.literal("event"),
        event: z.string(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      z.object({ type: z.literal("manual") }),
      z.object({ type: z.literal("segment"), segmentId: z.string() }),
    ])
    .optional(),
  steps: z.record(
    z.string(),
    z.object({
      kind: z.enum(["send", "wait", "branch", "exit"]),
      config: z.record(z.string(), z.unknown()),
      next: z.string().nullable().optional(),
      branches: z
        .array(
          z.object({
            condition: z.record(z.string(), z.unknown()),
            next: z.string(),
          })
        )
        .optional(),
    })
  ),
})

const PatchJourneySchema = z.object({
  name: z.string().min(1).optional(),
  trigger: z
    .union([
      z.object({
        type: z.literal("event"),
        event: z.string(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      z.object({ type: z.literal("manual") }),
      z.object({ type: z.literal("segment"), segmentId: z.string() }),
    ])
    .nullable()
    .optional(),
  steps: z
    .record(
      z.string(),
      z.object({
        kind: z.enum(["send", "wait", "branch", "exit"]),
        config: z.record(z.string(), z.unknown()),
        next: z.string().nullable().optional(),
        branches: z
          .array(
            z.object({
              condition: z.record(z.string(), z.unknown()),
              next: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  status: z.enum(["paused"]).optional(),
})

const EnrollSchema = z.object({
  recipientId: z.string(),
})

const listRoute = createRoute({
  method: "get",
  path: "/journeys",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListJourneysResponseSchema } },
      description: "Journeys list",
    },
  },
})

const createRoute_ = createRoute({
  method: "post",
  path: "/journeys",
  request: {
    body: { content: { "application/json": { schema: CreateJourneySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey created",
    },
  },
})

const getRoute = createRoute({
  method: "get",
  path: "/journeys/:id",
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey detail",
    },
  },
})

const patchRoute = createRoute({
  method: "patch",
  path: "/journeys/:id",
  request: {
    body: { content: { "application/json": { schema: PatchJourneySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey updated",
    },
  },
})

const deleteRoute = createRoute({
  method: "delete",
  path: "/journeys/:id",
  responses: {
    204: { description: "Journey deleted" },
  },
})

const activateRoute = createRoute({
  method: "post",
  path: "/journeys/:id/activate",
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey activated",
    },
  },
})

const listRunsRoute = createRoute({
  method: "get",
  path: "/journeys/:id/runs",
  request: {
    query: listQuerySchema({
      sortable: RUN_SORTABLE,
      filterable: {},
      defaultSort: RUN_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListRunsResponseSchema } },
      description: "Journey runs",
    },
  },
})

const enrollRoute = createRoute({
  method: "post",
  path: "/journeys/:id/enroll",
  request: {
    body: { content: { "application/json": { schema: EnrollSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: JourneyRunDtoSchema } },
      description: "Recipient enrolled",
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

router.openapi(listRoute, async (c) => {
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

router.openapi(createRoute_, async (c) => {
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

router.openapi(getRoute, async (c) => {
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

router.openapi(patchRoute, async (c) => {
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

router.openapi(deleteRoute, async (c) => {
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

router.openapi(activateRoute, async (c) => {
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

router.openapi(listRunsRoute, async (c) => {
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

router.openapi(enrollRoute, async (c) => {
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
          recipient.attributes ? JSON.parse(recipient.attributes as string) : {}
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

export default router
