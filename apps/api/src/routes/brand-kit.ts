import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { BrandKitDtoSchema, getRoute, putRoute } from "./brand-kit.contract"

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(getRoute, async (c) => {
    const userId = c.var.user!.id

    const row = await c.var.db
      .selectFrom("brand_kit")
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!row) throw Errors.notFound("BrandKit")
    return c.json(row as z.infer<typeof BrandKitDtoSchema>)
  })

  .openapi(putRoute, async (c) => {
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
