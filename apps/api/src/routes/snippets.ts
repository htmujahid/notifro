import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = {
  updatedAt: "updatedAt",
  name: "name",
  createdAt: "createdAt",
}
const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
}
const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

const SnippetDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const CreateSnippetSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.record(z.string(), z.unknown()),
})

const listRoute = createRoute({
  method: "get",
  path: "/snippets",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(SnippetDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Snippets list",
    },
  },
})

const createRoute_ = createRoute({
  method: "post",
  path: "/snippets",
  request: {
    body: { content: { "application/json": { schema: CreateSnippetSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SnippetDtoSchema } },
      description: "Created snippet",
    },
  },
})

const patchRoute = createRoute({
  method: "patch",
  path: "/snippets/:id",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateSnippetSchema.partial() },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SnippetDtoSchema } },
      description: "Updated snippet",
    },
  },
})

const deleteRoute = createRoute({
  method: "delete",
  path: "/snippets/:id",
  responses: { 204: { description: "Deleted" } },
})

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id

    const baseQuery = c.var.db
      .selectFrom("snippet")
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
      data: page.data as z.infer<typeof SnippetDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = newId()

    await c.var.db
      .insertInto("snippet")
      .values({
        id,
        userId,
        name: body.name,
        content: JSON.stringify(body.content),
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const row = await c.var.db
      .selectFrom("snippet")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof SnippetDtoSchema>, 201)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()

    const existing = await c.var.db
      .selectFrom("snippet")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Snippet")

    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.name !== undefined) updates.name = body.name
    if (body.content !== undefined)
      updates.content = JSON.stringify(body.content)

    await c.var.db
      .updateTable("snippet")
      .set(updates)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    const row = await c.var.db
      .selectFrom("snippet")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof SnippetDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const existing = await c.var.db
      .selectFrom("snippet")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!existing) throw Errors.notFound("Snippet")

    await c.var.db
      .deleteFrom("snippet")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()
    return new Response(null, { status: 204 })
  })
