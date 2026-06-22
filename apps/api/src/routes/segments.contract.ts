import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"
import type { FilterNode } from "../lib/segment-resolver"

export const SORTABLE = {
  updatedAt: "updatedAt",
  createdAt: "createdAt",
  name: "name",
}
export const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
}
export const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

export const FilterClauseSchema: z.ZodType<FilterNode> = z.lazy(() =>
  z.union([
    z.object({ and: z.array(FilterClauseSchema) }),
    z.object({ or: z.array(FilterClauseSchema) }),
    z.object({
      field: z.string().min(1).max(64),
      op: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.union([z.string(), z.number()])),
      ]),
    }),
  ])
)

export const SegmentDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  filter: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// z.lazy() causes infinite recursion in OpenAPI generator; use generic JSON schema for routes
export const FilterInputSchema = z.record(z.string(), z.unknown()).openapi({
  description:
    "Recursive filter clause: leaf { field, op, value } or composite { and/or: [...] }",
  example: { field: "email", op: "eq", value: "user@example.com" },
})

export const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(255),
  filter: FilterInputSchema,
})

export const PatchSegmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  filter: FilterInputSchema.optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(SegmentDtoSchema),
  nextCursor: z.string().nullable(),
})

export const PreviewResponseSchema = z.object({
  count: z.number(),
  sample: z.array(z.object({ id: z.string(), email: z.string().nullable() })),
})

export const listRoute = createRoute({
  method: "get",
  path: "/segments",
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
      description: "Paginated segments",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/segments",
  request: {
    body: { content: { "application/json": { schema: CreateSegmentSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SegmentDtoSchema } },
      description: "Created segment",
    },
  },
})

export const detailRoute = createRoute({
  method: "get",
  path: "/segments/:id",
  responses: {
    200: {
      content: { "application/json": { schema: SegmentDtoSchema } },
      description: "Segment detail",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/segments/:id",
  request: {
    body: { content: { "application/json": { schema: PatchSegmentSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SegmentDtoSchema } },
      description: "Updated segment",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/segments/:id",
  responses: { 204: { description: "Deleted" } },
})

export const previewRoute = createRoute({
  method: "get",
  path: "/segments/:id/preview",
  responses: {
    200: {
      content: { "application/json": { schema: PreviewResponseSchema } },
      description: "Segment preview",
    },
  },
})
