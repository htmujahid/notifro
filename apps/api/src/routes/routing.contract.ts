import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { priority: "priority", createdAt: "createdAt" }
export const FILTERABLE = {}
export const DEFAULT_SORT = { key: "priority", order: "asc" as const }

export const MatchSchema = z.object({
  messageType: z.string().optional(),
  minPriority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  recipientAttr: z
    .object({
      field: z.string().min(1),
      op: z.string().min(1),
      value: z.unknown(),
    })
    .optional(),
  timeWindow: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
})

export const RoutingRuleDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  priority: z.number(),
  enabled: z.number(),
  match: z.string(),
  targetChainId: z.string().nullable(),
  targetChannel: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateRoutingRuleSchema = z
  .object({
    priority: z.number().int().min(0),
    enabled: z.boolean().optional().default(true),
    match: MatchSchema,
    targetChainId: z.string().optional(),
    targetChannel: z.string().optional(),
  })
  .refine(
    (v) => v.targetChainId !== undefined || v.targetChannel !== undefined,
    { message: "Either targetChainId or targetChannel is required" }
  )

export const PatchRoutingRuleSchema = z.object({
  priority: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  match: MatchSchema.optional(),
  targetChainId: z.string().nullable().optional(),
  targetChannel: z.string().nullable().optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(RoutingRuleDtoSchema),
  nextCursor: z.string().nullable(),
})

export const ResolveRequestSchema = z.object({
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  messageType: z.string().optional(),
})

export const ResolveResponseSchema = z.object({
  result: z.union([
    z.object({ type: z.literal("channel"), channel: z.string() }),
    z.object({
      type: z.literal("chain"),
      chainId: z.string(),
      steps: z.array(z.unknown()),
    }),
    z.null(),
  ]),
})

export const listRoute = createRoute({
  method: "get",
  path: "/routing/rules",
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
      description: "Paginated routing rules",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/routing/rules",
  request: {
    body: {
      content: { "application/json": { schema: CreateRoutingRuleSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RoutingRuleDtoSchema } },
      description: "Created routing rule",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/routing/rules/:id",
  request: {
    body: {
      content: { "application/json": { schema: PatchRoutingRuleSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RoutingRuleDtoSchema } },
      description: "Updated routing rule",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/routing/rules/:id",
  responses: { 204: { description: "Deleted" } },
})

export const resolveRoute_ = createRoute({
  method: "post",
  path: "/routing/resolve",
  request: {
    body: { content: { "application/json": { schema: ResolveRequestSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ResolveResponseSchema } },
      description: "Resolved route (dry-run)",
    },
  },
})
