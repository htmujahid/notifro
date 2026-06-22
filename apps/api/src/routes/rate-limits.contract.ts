import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { createdAt: "createdAt", channel: "channel" }
export const FILTERABLE = {}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const RateLimitRuleDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  maxCount: z.number(),
  windowSeconds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateRateLimitRuleSchema = z.object({
  channel: z.string().min(1),
  maxCount: z.number().int().min(1),
  windowSeconds: z.number().int().min(1),
})

export const PatchRateLimitRuleSchema = z.object({
  maxCount: z.number().int().min(1).optional(),
  windowSeconds: z.number().int().min(1).optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(RateLimitRuleDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/rate-limits",
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
      description: "Paginated rate limit rules",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/rate-limits",
  request: {
    body: {
      content: { "application/json": { schema: CreateRateLimitRuleSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RateLimitRuleDtoSchema } },
      description: "Created or updated rate limit rule",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/rate-limits/:id",
  request: {
    body: {
      content: { "application/json": { schema: PatchRateLimitRuleSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RateLimitRuleDtoSchema } },
      description: "Updated rate limit rule",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/rate-limits/:id",
  responses: {
    204: { description: "Deleted" },
  },
})
