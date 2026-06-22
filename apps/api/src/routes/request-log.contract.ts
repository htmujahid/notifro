import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { createdAt: "createdAt" }
export const FILTERABLE = {
  method: { column: "method", schema: z.string(), operator: "eq" as const },
  status: {
    column: "status",
    schema: z.coerce.number().int(),
    operator: "eq" as const,
  },
  path: { column: "path", schema: z.string(), operator: "like" as const },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const ApiRequestLogDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  apiKeyId: z.string().nullable(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  latencyMs: z.number().nullable(),
  createdAt: z.string(),
})

export const ListResponseSchema = z.object({
  data: z.array(ApiRequestLogDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/request-log",
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
      description: "Paginated request log",
    },
  },
})
