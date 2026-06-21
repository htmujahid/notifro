import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const ProviderFallbackDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  primaryConnectionId: z.string(),
  fallbackConnectionId: z.string(),
  createdAt: z.string(),
})

const ListResponseSchema = z.object({
  data: z.array(ProviderFallbackDtoSchema),
  nextCursor: z.string().nullable(),
})

const CreateSchema = z.object({
  channel: z.string().min(1),
  primaryConnectionId: z.string().min(1),
  fallbackConnectionId: z.string().min(1),
})

const listRoute = createRoute({
  method: "get",
  path: "/provider-fallbacks",
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "Provider fallback rules",
    },
  },
})

const createRoute_ = createRoute({
  method: "post",
  path: "/provider-fallbacks",
  request: {
    body: { content: { "application/json": { schema: CreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ProviderFallbackDtoSchema } },
      description: "Rule created or updated",
    },
  },
})

const deleteRoute = createRoute({
  method: "delete",
  path: "/provider-fallbacks/:id",
  responses: {
    204: { description: "Rule deleted" },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

router.openapi(listRoute, async (c) => {
  const { db } = c.var
  const userId = c.var.user!.id
  const rows = await db
    .selectFrom("provider_fallback")
    .where("userId", "=", userId)
    .selectAll()
    .orderBy("createdAt", "desc")
    .execute()
  return c.json({ data: rows, nextCursor: null })
})

router.openapi(createRoute_, async (c) => {
  const body = c.req.valid("json")
  const { db } = c.var
  const userId = c.var.user!.id
  const ts = new Date().toISOString()
  const id = crypto.randomUUID()
  await db
    .insertInto("provider_fallback")
    .values({
      id,
      userId,
      channel: body.channel,
      primaryConnectionId: body.primaryConnectionId,
      fallbackConnectionId: body.fallbackConnectionId,
      createdAt: ts,
    })
    .onConflict((oc) =>
      oc.columns(["userId", "channel"]).doUpdateSet({
        primaryConnectionId: body.primaryConnectionId,
        fallbackConnectionId: body.fallbackConnectionId,
      })
    )
    .execute()
  const row = await db
    .selectFrom("provider_fallback")
    .where("userId", "=", userId)
    .where("channel", "=", body.channel)
    .selectAll()
    .executeTakeFirstOrThrow()
  return c.json(row, 201)
})

router.openapi(deleteRoute, async (c) => {
  const { db } = c.var
  const userId = c.var.user!.id
  const id = c.req.param("id")
  const existing = await db
    .selectFrom("provider_fallback")
    .where("id", "=", id)
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()
  if (!existing) throw Errors.notFound("Provider fallback")
  await db.deleteFrom("provider_fallback").where("id", "=", id).execute()
  return new Response(null, { status: 204 })
})

export default router
