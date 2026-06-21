import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = { createdAt: "createdAt", sendAt: "sendAt" }
const FILTERABLE = {
  status: {
    column: "status",
    schema: z.enum(["pending", "enqueued", "cancelled"]),
    operator: "eq" as const,
  },
}
const DEFAULT_SORT = { key: "sendAt", order: "asc" as const }

const ScheduledMessageDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sendAt: z.string(),
  status: z.string(),
  timezone: z.string().nullable(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  deliveryWindowStart: z.string().nullable(),
  deliveryWindowEnd: z.string().nullable(),
  respectQuietHours: z.number(),
  notificationId: z.string().nullable(),
  recurringSendId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ListResponseSchema = z.object({
  data: z.array(ScheduledMessageDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: "get",
  path: "/schedules",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "Paginated scheduled messages",
    },
  },
})

const deleteRoute = createRoute({
  method: "delete",
  path: "/schedules/:id",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.literal(true) }) },
      },
      description: "Cancelled",
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

router.openapi(listRoute, async (c) => {
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

router.openapi(deleteRoute, async (c) => {
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

export default router
