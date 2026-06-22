import { createRoute, z } from "@hono/zod-openapi"

export const ApiKeyDtoSchema = z.object({
  id: z.string(),
  referenceId: z.string(),
  name: z.string().nullable(),
  start: z.string().nullable(),
  prefix: z.string().nullable(),
  enabled: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  lastRequest: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ApiKeyCreateResponseSchema = ApiKeyDtoSchema.extend({
  key: z.string(),
})

export const CreateKeySchema = z.object({
  name: z.string().min(1).max(32),
})

export const ListResponseSchema = z.object({
  data: z.array(ApiKeyDtoSchema),
  nextCursor: z.null(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/keys",
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "API keys",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/keys",
  request: {
    body: { content: { "application/json": { schema: CreateKeySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiKeyCreateResponseSchema } },
      description: "Created API key (plaintext shown once)",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/keys/:id",
  responses: {
    204: { description: "Revoked" },
  },
})
