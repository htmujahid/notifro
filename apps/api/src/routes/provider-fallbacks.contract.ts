import { createRoute, z } from "@hono/zod-openapi"

export const ProviderFallbackDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  primaryConnectionId: z.string(),
  fallbackConnectionId: z.string(),
  createdAt: z.string(),
})

export const ListResponseSchema = z.object({
  data: z.array(ProviderFallbackDtoSchema),
  nextCursor: z.string().nullable(),
})

export const CreateSchema = z.object({
  channel: z.string().min(1),
  primaryConnectionId: z.string().min(1),
  fallbackConnectionId: z.string().min(1),
})

export const listRoute = createRoute({
  method: "get",
  path: "/provider-fallbacks",
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "Provider fallback rules",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/provider-fallbacks",
  request: {
    body: { content: { "application/json": { schema: CreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ProviderFallbackDtoSchema } },
      description: "Rule created or updated",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/provider-fallbacks/:id",
  responses: {
    204: { description: "Rule deleted" },
  },
})
