import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery, listQuerySchema } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const SORTABLE = { version: "version", createdAt: "createdAt" }
const FILTERABLE = {}
const DEFAULT_SORT = { key: "version", order: "desc" as const }

const VersionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  version: z.number(),
  content: z.string(),
  localeStrings: z.string().nullable(),
  variables: z.string().nullable(),
  createdAt: z.string(),
})

const listVersionsRoute = createRoute({
  method: "get",
  path: "/templates/:id/versions",
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
            data: z.array(VersionDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Version history",
    },
  },
})

const restoreVersionRoute = createRoute({
  method: "post",
  path: "/templates/:id/versions/:version/restore",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            version: z.number(),
            message: z.string(),
          }),
        },
      },
      description: "Restored version",
    },
  },
})

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

router.openapi(listVersionsRoute, async (c) => {
  const { id } = c.req.param()
  const parsed = c.req.valid("query")
  const userId = c.var.user!.id

  const template = await c.var.db
    .selectFrom("template")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .select("id")
    .executeTakeFirst()

  if (!template) throw Errors.notFound("Template")

  const baseQuery = c.var.db
    .selectFrom("template_version")
    .where("templateId", "=", id)
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
    data: page.data as z.infer<typeof VersionDtoSchema>[],
    nextCursor: page.nextCursor,
  })
})

router.openapi(restoreVersionRoute, async (c) => {
  const { id, version } = c.req.param()
  const userId = c.var.user!.id
  const ts = now()

  const template = await c.var.db
    .selectFrom("template")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()

  if (!template) throw Errors.notFound("Template")

  const versionRow = await c.var.db
    .selectFrom("template_version")
    .where("templateId", "=", id)
    .where("version", "=", Number(version))
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()

  if (!versionRow) throw Errors.notFound("Version")

  const maxVersionRow = await c.var.db
    .selectFrom("template_version")
    .where("templateId", "=", id)
    .select(c.var.db.fn.max("version").as("maxVersion"))
    .executeTakeFirst()
  const nextVersion = ((maxVersionRow?.maxVersion as number | null) ?? 0) + 1

  await c.var.db
    .insertInto("template_version")
    .values({
      id: newId(),
      userId,
      templateId: id,
      version: nextVersion,
      content: template.content,
      localeStrings: template.localeStrings,
      variables: template.variables,
      createdAt: ts,
    })
    .execute()

  await c.var.db
    .updateTable("template")
    .set({
      content: versionRow.content,
      localeStrings: versionRow.localeStrings,
      variables: versionRow.variables,
      updatedAt: ts,
    })
    .where("id", "=", id)
    .where("userId", "=", userId)
    .execute()

  return c.json({
    id,
    version: nextVersion,
    message: `Restored to version ${version}; new version is ${nextVersion}`,
  })
})

export default router
