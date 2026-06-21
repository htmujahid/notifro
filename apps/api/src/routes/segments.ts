import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import { previewSegment } from "../lib/segment-resolver"
import type { FilterNode } from "../lib/segment-resolver"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = {
  updatedAt: "updatedAt",
  createdAt: "createdAt",
  name: "name",
}
const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
}
const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

const FilterClauseSchema: z.ZodType<FilterNode> = z.lazy(() =>
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

const SegmentDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  filter: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(255),
  filter: FilterClauseSchema,
})

const PatchSegmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  filter: FilterClauseSchema.optional(),
})

const ListResponseSchema = z.object({
  data: z.array(SegmentDtoSchema),
  nextCursor: z.string().nullable(),
})

const PreviewResponseSchema = z.object({
  count: z.number(),
  sample: z.array(z.object({ id: z.string(), email: z.string().nullable() })),
})

const listRoute = createRoute({
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

const createRoute_ = createRoute({
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

const detailRoute = createRoute({
  method: "get",
  path: "/segments/:id",
  responses: {
    200: {
      content: { "application/json": { schema: SegmentDtoSchema } },
      description: "Segment detail",
    },
  },
})

const patchRoute = createRoute({
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

const deleteRoute = createRoute({
  method: "delete",
  path: "/segments/:id",
  responses: { 204: { description: "Deleted" } },
})

const previewRoute = createRoute({
  method: "get",
  path: "/segments/:id/preview",
  responses: {
    200: {
      content: { "application/json": { schema: PreviewResponseSchema } },
      description: "Segment preview",
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

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid("query")
  const userId = c.var.user!.id
  const baseQuery = c.var.db
    .selectFrom("segment")
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
    data: page.data as z.infer<typeof SegmentDtoSchema>[],
    nextCursor: page.nextCursor,
  })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid("json")
  const userId = c.var.user!.id
  const ts = now()
  const id = newId()
  await c.var.db
    .insertInto("segment")
    .values({
      id,
      userId,
      name: body.name,
      filter: JSON.stringify(body.filter),
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()
  const row = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof SegmentDtoSchema>, 201)
})

router.openapi(detailRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const row = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()
  if (!row) throw Errors.notFound("Segment")
  return c.json(row as z.infer<typeof SegmentDtoSchema>)
})

router.openapi(patchRoute, async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid("json")
  const userId = c.var.user!.id
  const ts = now()
  const existing = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .select("id")
    .executeTakeFirst()
  if (!existing) throw Errors.notFound("Segment")
  const updates: Record<string, string> = { updatedAt: ts }
  if (body.name !== undefined) updates.name = body.name
  if (body.filter !== undefined) updates.filter = JSON.stringify(body.filter)
  await c.var.db
    .updateTable("segment")
    .set(updates)
    .where("id", "=", id)
    .execute()
  const row = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow()
  return c.json(row as z.infer<typeof SegmentDtoSchema>)
})

router.openapi(deleteRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const existing = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .select("id")
    .executeTakeFirst()
  if (!existing) throw Errors.notFound("Segment")
  await c.var.db.deleteFrom("segment").where("id", "=", id).execute()
  return new Response(null, { status: 204 })
})

router.openapi(previewRoute, async (c) => {
  const { id } = c.req.param()
  const userId = c.var.user!.id
  const segment = await c.var.db
    .selectFrom("segment")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .select("filter")
    .executeTakeFirst()
  if (!segment) throw Errors.notFound("Segment")
  let filter: FilterNode
  try {
    filter = JSON.parse(segment.filter) as FilterNode
  } catch {
    return c.json({ count: 0, sample: [] })
  }
  const result = await previewSegment(c.var.db, userId, filter)
  return c.json(result)
})

export default router
