import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = {
  createdAt: "createdAt",
  name: "name",
}

const FILTERABLE = {
  name: { column: "name", schema: z.string(), operator: "like" as const },
}

const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

const ExampleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
})

const ListResponseSchema = z.object({
  data: z.array(ExampleItemSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: "get",
  path: "/example",
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
      description: "Paginated list",
    },
  },
})

const CreateBodySchema = z.object({
  name: z.string().min(1),
})

const createRoute_ = createRoute({
  method: "post",
  path: "/example",
  request: {
    body: { content: { "application/json": { schema: CreateBodySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ExampleItemSchema } },
      description: "Created",
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use("*", requireAuth)

export default router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid("query")
  const userId = c.var.user!.id
  const baseQuery = c.var.db
    .selectFrom("user")
    .where("id", "=", userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])
  return c.json({
    data: page.data as z.infer<typeof ExampleItemSchema>[],
    nextCursor: page.nextCursor,
  })
})

  .openapi(createRoute_, async (c) => {
  const body = c.req.valid("json")
  if (!body.name) throw Errors.badRequest("Name is required")
  return c.json(
    { id: "stub", name: body.name, createdAt: new Date().toISOString() },
    201
  )
})
