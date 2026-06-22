import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = {
  updatedAt: "updatedAt",
  name: "name",
  createdAt: "createdAt",
}
export const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
  defaultLocale: {
    column: "defaultLocale",
    schema: z.string(),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

export const VariableDefSchema = z.object({
  key: z.string().min(1),
  type: z
    .enum(["string", "number", "boolean", "array", "object"])
    .default("string"),
  required: z.boolean().optional().default(false),
})

export const TemplateDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  defaultLocale: z.string(),
  content: z.string(),
  variables: z.string().nullable(),
  localeStrings: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_]+$/, "slug must be lowercase alphanumeric with - or _"),
  description: z.string().optional(),
  defaultLocale: z.string().default("en"),
  content: z.record(z.string(), z.unknown()),
  variables: z.array(VariableDefSchema).optional(),
  localeStrings: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional(),
})

export const PatchTemplateSchema = CreateTemplateSchema.partial()

export const RenderRequestSchema = z.object({
  data: z.record(z.string(), z.unknown()).default({}),
  locale: z.string().optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(TemplateDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/templates",
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
      description: "Paginated templates",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/templates",
  request: {
    body: { content: { "application/json": { schema: CreateTemplateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: TemplateDtoSchema } },
      description: "Created template",
    },
  },
})

export const detailRoute = createRoute({
  method: "get",
  path: "/templates/:id",
  responses: {
    200: {
      content: { "application/json": { schema: TemplateDtoSchema } },
      description: "Template",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/templates/:id",
  request: {
    body: { content: { "application/json": { schema: PatchTemplateSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TemplateDtoSchema } },
      description: "Updated template",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/templates/:id",
  responses: {
    204: { description: "Deleted" },
  },
})

export const renderRoute = createRoute({
  method: "post",
  path: "/templates/:id/render",
  request: {
    body: { content: { "application/json": { schema: RenderRequestSchema } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.record(z.string(), z.unknown()),
            templateId: z.string(),
            locale: z.string(),
          }),
        },
      },
      description: "Rendered content",
    },
  },
})
