import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { createdAt: "createdAt", url: "url" }
export const FILTERABLE = {
  enabled: {
    column: "enabled",
    schema: z.enum(["true", "false"]).transform((v) => (v === "true" ? 1 : 0)),
    operator: "eq" as const,
  },
  q: { column: "url", schema: z.string(), operator: "like" as const },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const WebhookDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  secretLast4: z.string(),
  headers: z.record(z.string(), z.string()).nullable(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const WebhookWithSecretSchema = WebhookDtoSchema.extend({
  secret: z.string(),
})

export const ListResponseSchema = z.object({
  data: z.array(WebhookDtoSchema),
  nextCursor: z.string().nullable(),
})

export const TestResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().nullable(),
  latencyMs: z.number(),
  error: z.string().optional(),
})

export const CreateBodySchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  description: z.string().max(255).optional(),
  enabled: z.boolean().optional().default(true),
})

export const UpdateBodySchema = z.object({
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).nullable().optional(),
  description: z.string().max(255).nullable().optional(),
  enabled: z.boolean().optional(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/channels/webhooks",
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
      description: "Paginated webhook endpoints",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/channels/webhooks",
  request: {
    body: { content: { "application/json": { schema: CreateBodySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: WebhookWithSecretSchema } },
      description: "Created webhook endpoint",
    },
  },
})

export const updateRoute = createRoute({
  method: "patch",
  path: "/channels/webhooks/:id",
  request: {
    body: { content: { "application/json": { schema: UpdateBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: WebhookDtoSchema } },
      description: "Updated webhook endpoint",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/channels/webhooks/:id",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Deleted",
    },
  },
})

export const testRoute = createRoute({
  method: "post",
  path: "/channels/webhooks/:id/test",
  responses: {
    200: {
      content: { "application/json": { schema: TestResultSchema } },
      description: "Test delivery result",
    },
  },
})
