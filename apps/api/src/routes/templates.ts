import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import { renderTemplate } from "../lib/render-template"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  TemplateDtoSchema,
  createRoute_,
  deleteRoute,
  detailRoute,
  listRoute,
  patchRoute,
  renderRoute,
} from "./templates.contract"

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
      .selectFrom("template")
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
      data: page.data as z.infer<typeof TemplateDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()
    const id = newId()

    const existing = await c.var.db
      .selectFrom("template")
      .where("userId", "=", userId)
      .where("slug", "=", body.slug)
      .select("id")
      .executeTakeFirst()

    if (existing)
      throw Errors.badRequest(`Template slug '${body.slug}' already exists`)

    await c.var.db
      .insertInto("template")
      .values({
        id,
        userId,
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        defaultLocale: body.defaultLocale,
        content: JSON.stringify(body.content),
        variables: body.variables ? JSON.stringify(body.variables) : null,
        localeStrings: body.localeStrings
          ? JSON.stringify(body.localeStrings)
          : null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const row = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row as z.infer<typeof TemplateDtoSchema>, 201)
  })

  .openapi(detailRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const row = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!row) throw Errors.notFound("Template")
    return c.json(row as z.infer<typeof TemplateDtoSchema>)
  })

  .openapi(patchRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()

    const existing = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Template")

    if (body.slug && body.slug !== existing.slug) {
      const conflict = await c.var.db
        .selectFrom("template")
        .where("userId", "=", userId)
        .where("slug", "=", body.slug)
        .select("id")
        .executeTakeFirst()
      if (conflict)
        throw Errors.badRequest(`Template slug '${body.slug}' already exists`)
    }

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
        content: existing.content,
        localeStrings: existing.localeStrings,
        variables: existing.variables,
        createdAt: ts,
      })
      .execute()

    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.name !== undefined) updates.name = body.name
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.description !== undefined)
      updates.description = body.description ?? null
    if (body.defaultLocale !== undefined)
      updates.defaultLocale = body.defaultLocale
    if (body.content !== undefined)
      updates.content = JSON.stringify(body.content)
    if (body.variables !== undefined)
      updates.variables = body.variables ? JSON.stringify(body.variables) : null
    if (body.localeStrings !== undefined)
      updates.localeStrings = body.localeStrings
        ? JSON.stringify(body.localeStrings)
        : null

    await c.var.db
      .updateTable("template")
      .set(updates)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    const row = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row as z.infer<typeof TemplateDtoSchema>)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const existing = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Template")

    await c.var.db
      .deleteFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    return new Response(null, { status: 204 })
  })

  .openapi(renderRoute, async (c) => {
    const { id } = c.req.param()
    const { data, locale } = c.req.valid("json")
    const userId = c.var.user!.id

    const template = await c.var.db
      .selectFrom("template")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!template) throw Errors.notFound("Template")

    const content = renderTemplate(template, data, locale)

    const resolvedLocale = locale ?? template.defaultLocale

    return c.json({ content, templateId: id, locale: resolvedLocale })
  })
