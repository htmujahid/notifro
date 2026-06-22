import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = {
  name: "name",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
}
export const FILTERABLE = {}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const ChainStepSchema = z.object({
  channel: z.string().min(1),
  connectionId: z.string().optional(),
  waitForDeliveryMs: z.number().int().min(0).default(0),
  successOn: z.array(z.enum(["delivered", "opened", "clicked"])).min(1),
})

export const FallbackChainDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  steps: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateFallbackChainSchema = z.object({
  name: z.string().min(1).max(255),
  steps: z.array(ChainStepSchema).min(1).max(10),
})

export const PatchFallbackChainSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  steps: z.array(ChainStepSchema).min(1).max(10).optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(FallbackChainDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/routing/chains",
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
      description: "Paginated fallback chains",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/routing/chains",
  request: {
    body: {
      content: { "application/json": { schema: CreateFallbackChainSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: FallbackChainDtoSchema } },
      description: "Created fallback chain",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/routing/chains/:id",
  request: {
    body: {
      content: { "application/json": { schema: PatchFallbackChainSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: FallbackChainDtoSchema } },
      description: "Updated fallback chain",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/routing/chains/:id",
  responses: { 204: { description: "Deleted" } },
})
