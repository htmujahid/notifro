import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const BrandKitDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  logoUrl: z.string().nullable(),
  colors: z.string().nullable(),
  fontStack: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const UpdateBrandKitSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  colors: z.record(z.string(), z.string()).nullable().optional(),
  fontStack: z.string().nullable().optional(),
})

const getRoute = createRoute({
  method: "get",
  path: "/brand-kit",
  responses: {
    200: {
      content: { "application/json": { schema: BrandKitDtoSchema } },
      description: "Brand kit",
    },
  },
})

const putRoute = createRoute({
  method: "put",
  path: "/brand-kit",
  request: {
    body: { content: { "application/json": { schema: UpdateBrandKitSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BrandKitDtoSchema } },
      description: "Updated brand kit",
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

router.openapi(getRoute, async (c) => {
  const userId = c.var.user!.id

  const row = await c.var.db
    .selectFrom("brand_kit")
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()

  if (!row) throw Errors.notFound("BrandKit")
  return c.json(row as z.infer<typeof BrandKitDtoSchema>)
})

router.openapi(putRoute, async (c) => {
  const body = c.req.valid("json")
  const userId = c.var.user!.id
  const ts = now()

  const existing = await c.var.db
    .selectFrom("brand_kit")
    .where("userId", "=", userId)
    .select("id")
    .executeTakeFirst()

  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: ts }
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl
    if (body.colors !== undefined)
      updates.colors = body.colors ? JSON.stringify(body.colors) : null
    if (body.fontStack !== undefined) updates.fontStack = body.fontStack

    await c.var.db
      .updateTable("brand_kit")
      .set(updates)
      .where("userId", "=", userId)
      .execute()
  } else {
    await c.var.db
      .insertInto("brand_kit")
      .values({
        id: newId(),
        userId,
        logoUrl: body.logoUrl ?? null,
        colors: body.colors ? JSON.stringify(body.colors) : null,
        fontStack: body.fontStack ?? null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()
  }

  const row = await c.var.db
    .selectFrom("brand_kit")
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirstOrThrow()

  return c.json(row as z.infer<typeof BrandKitDtoSchema>)
})

export default router
