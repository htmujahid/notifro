import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import { resolveRoute } from "../lib/routing"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = { priority: "priority", createdAt: "createdAt" }
const FILTERABLE = {}
const DEFAULT_SORT = { key: "priority", order: "asc" as const }

const MatchSchema = z.object({
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

const RoutingRuleDtoSchema = z.object({
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

const CreateRoutingRuleSchema = z
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

const PatchRoutingRuleSchema = z.object({
  priority: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  match: MatchSchema.optional(),
  targetChainId: z.string().nullable().optional(),
  targetChannel: z.string().nullable().optional(),
})

const ListResponseSchema = z.object({
  data: z.array(RoutingRuleDtoSchema),
  nextCursor: z.string().nullable(),
})

const ResolveRequestSchema = z.object({
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  messageType: z.string().optional(),
})

const ResolveResponseSchema = z.object({
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

const listRoute = createRoute({
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

const createRoute_ = createRoute({
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

const patchRoute = createRoute({
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

const deleteRoute = createRoute({
  method: "delete",
  path: "/routing/rules/:id",
  responses: { 204: { description: "Deleted" } },
})

const resolveRoute_ = createRoute({
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

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("routing_rule")
      .where("userId", "=", userId)
      .selectAll()
    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    })
    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])
    return c.json({
      data: page.data as z.infer<typeof RoutingRuleDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = newId()
    await c.var.db
      .insertInto("routing_rule")
      .values({
        id,
        userId,
        priority: body.priority,
        enabled: body.enabled !== false ? 1 : 0,
        match: JSON.stringify(body.match),
        targetChainId: body.targetChainId ?? null,
        targetChannel: body.targetChannel ?? null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
    const row = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof RoutingRuleDtoSchema>, 201)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const existing = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("RoutingRule")
    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0
    if (body.match !== undefined) updates.match = JSON.stringify(body.match)
    if (body.targetChainId !== undefined)
      updates.targetChainId = body.targetChainId
    if (body.targetChannel !== undefined)
      updates.targetChannel = body.targetChannel
    await c.var.db
      .updateTable("routing_rule")
      .set(updates)
      .where("id", "=", id)
      .execute()
    const row = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof RoutingRuleDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const existing = await c.var.db
      .selectFrom("routing_rule")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("RoutingRule")
    await c.var.db.deleteFrom("routing_rule").where("id", "=", id).execute()
    return new Response(null, { status: 204 })
  })

  .openapi(resolveRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const result = await resolveRoute(c.var.db, userId, {
      priority: body.priority,
      messageType: body.messageType,
    })
    return c.json({ result })
  })
