import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { createdAt: "createdAt", sendAt: "sendAt" }
export const FILTERABLE = {
  status: {
    column: "status",
    schema: z.enum(["pending", "enqueued", "cancelled"]),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "sendAt", order: "asc" as const }

export const ScheduledMessageDtoSchema = z.object({
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

export const ListResponseSchema = z.object({
  data: z.array(ScheduledMessageDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
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

export const deleteRoute = createRoute({
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
