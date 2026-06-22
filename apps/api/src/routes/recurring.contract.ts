import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const RecurringSendDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  cron: z.string(),
  timezone: z.string(),
  channels: z.string(),
  nextRunAt: z.string(),
  lastRunAt: z.string().nullable(),
  enabled: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const RunDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sendAt: z.string(),
  status: z.string(),
  timezone: z.string().nullable(),
  notificationId: z.string().nullable(),
  recurringSendId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateBodySchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  channels: z.array(z.string()).min(1),
  cron: z.string(),
  timezone: z.string().optional().default("UTC"),
})

export const PatchBodySchema = z.object({
  enabled: z.number().int().min(0).max(1).optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.string()).optional(),
})

export const SORTABLE = { createdAt: "createdAt", nextRunAt: "nextRunAt" }
export const FILTERABLE = {
  enabled: {
    column: "enabled",
    schema: z.coerce.number().int().min(0).max(1),
    operator: "eq" as const,
  },
  channel: {
    column: "channels",
    schema: z.string(),
    operator: "like" as const,
  },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const RUNS_SORTABLE = { sendAt: "sendAt" }
export const RUNS_FILTERABLE = {
  status: {
    column: "status",
    schema: z.enum(["pending", "enqueued", "cancelled"]),
    operator: "eq" as const,
  },
  from: { column: "sendAt", schema: z.string(), operator: "gte" as const },
  to: { column: "sendAt", schema: z.string(), operator: "lte" as const },
}
export const RUNS_DEFAULT_SORT = { key: "sendAt", order: "desc" as const }

export const ListResponseSchema = z.object({
  data: z.array(RecurringSendDtoSchema),
  nextCursor: z.string().nullable(),
})
export const RunsResponseSchema = z.object({
  data: z.array(RunDtoSchema),
  nextCursor: z.string().nullable(),
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/recurring",
  request: {
    body: { content: { "application/json": { schema: CreateBodySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RecurringSendDtoSchema } },
      description: "Created",
    },
  },
})

export const listRoute = createRoute({
  method: "get",
  path: "/recurring",
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
      description: "Paginated recurring sends",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/recurring/:id",
  request: {
    body: { content: { "application/json": { schema: PatchBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RecurringSendDtoSchema } },
      description: "Updated",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/recurring/:id",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.literal(true) }) },
      },
      description: "Deleted",
    },
  },
})

export const runsRoute = createRoute({
  method: "get",
  path: "/recurring/:id/runs",
  request: {
    query: listQuerySchema({
      sortable: RUNS_SORTABLE,
      filterable: RUNS_FILTERABLE,
      defaultSort: RUNS_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: RunsResponseSchema } },
      description: "Run history",
    },
  },
})
