import { OpenAPIHono } from "@hono/zod-openapi"

import { authInstance } from "../lib/auth"
import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { createRoute_, deleteRoute, listRoute } from "./keys.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use("/keys", requireAuth)
router.use("/keys/:id", requireAuth)

function toISOString(d: Date | null | string | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

function mapKey(k: {
  id: string
  referenceId: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean
  metadata: Record<string, unknown> | null
  lastRequest: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: k.id,
    referenceId: k.referenceId,
    name: k.name,
    start: k.start,
    prefix: k.prefix,
    enabled: k.enabled,
    metadata: k.metadata,
    lastRequest: toISOString(k.lastRequest),
    createdAt: toISOString(k.createdAt)!,
    updatedAt: toISOString(k.updatedAt)!,
  }
}

export default router
  .openapi(listRoute, async (c) => {
    const result = await authInstance.api.listApiKeys({
      headers: c.req.raw.headers,
    })
    return c.json({ data: result.apiKeys.map(mapKey), nextCursor: null })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const result = await authInstance.api.createApiKey({
      body: {
        name: body.name,
        userId: c.var.user!.id,
        prefix: body.mode === "test" ? "rk_test_" : "rk_live_",
        metadata: { mode: body.mode },
      },
    })
    return c.json({ ...mapKey(result), key: result.key }, 201)
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const result = await authInstance.api.deleteApiKey({
      body: { keyId: id },
      headers: c.req.raw.headers,
    })
    if (!result.success) throw Errors.notFound("api_key")
    return c.body(null, 204)
  })
