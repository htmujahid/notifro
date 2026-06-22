import { OpenAPIHono } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  approveRoute,
  createPendingRoute,
  deleteGateRoute,
  listGatesRoute,
  listPendingRoute,
  rejectRoute,
  upsertGateRoute,
} from "./mcp.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use("/mcp/gates", requireAuth)
router.use("/mcp/gates/:id", requireAuth)
router.use("/mcp/pending", requireAuth)
router.use("/mcp/pending/:id/approve", requireAuth)
router.use("/mcp/pending/:id/reject", requireAuth)

function now() {
  return new Date().toISOString()
}

export default router
  .openapi(listGatesRoute, async (c) => {
    const rows = await c.var.db
      .selectFrom("mcp_approval_gate")
      .where("userId", "=", c.var.user!.id)
      .orderBy("createdAt", "desc")
      .selectAll()
      .execute()
    return c.json({ data: rows })
  })

  .openapi(upsertGateRoute, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()
    const id = crypto.randomUUID()

    await db
      .insertInto("mcp_approval_gate")
      .values({
        id,
        userId,
        tool: body.tool,
        requiresApproval: body.requiresApproval ? 1 : 0,
        createdAt: ts,
        updatedAt: ts,
      })
      .onConflict((oc) =>
        oc.columns(["userId", "tool"]).doUpdateSet({
          requiresApproval: body.requiresApproval ? 1 : 0,
          updatedAt: ts,
        })
      )
      .execute()

    const row = await db
      .selectFrom("mcp_approval_gate")
      .where("userId", "=", userId)
      .where("tool", "=", body.tool)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(row)
  })

  .openapi(deleteGateRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db

    const existing = await db
      .selectFrom("mcp_approval_gate")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("mcp_approval_gate")
    await db
      .deleteFrom("mcp_approval_gate")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()
    return c.body(null, 204)
  })

  .openapi(listPendingRoute, async (c) => {
    const rows = await c.var.db
      .selectFrom("mcp_pending_action")
      .where("userId", "=", c.var.user!.id)
      .where("status", "=", "pending")
      .orderBy("createdAt", "desc")
      .select([
        "id",
        "userId",
        "tool",
        "status",
        "expiresAt",
        "createdAt",
        "updatedAt",
      ])
      .execute()
    return c.json({ data: rows })
  })

  .openapi(createPendingRoute, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()
    const id = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await db
      .insertInto("mcp_pending_action")
      .values({
        id,
        userId,
        tool: body.tool,
        payload: body.payload,
        status: "pending",
        expiresAt,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const row = await db
      .selectFrom("mcp_pending_action")
      .where("id", "=", id)
      .select([
        "id",
        "userId",
        "tool",
        "status",
        "expiresAt",
        "createdAt",
        "updatedAt",
      ])
      .executeTakeFirstOrThrow()

    return c.json(row, 201)
  })

  .openapi(approveRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()

    const action = await db
      .selectFrom("mcp_pending_action")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .where("status", "=", "pending")
      .selectAll()
      .executeTakeFirst()

    if (!action) throw Errors.notFound("mcp_pending_action")

    if (action.expiresAt < ts) {
      await db
        .updateTable("mcp_pending_action")
        .set({ status: "expired", updatedAt: ts })
        .where("id", "=", id)
        .execute()
      throw Errors.badRequest("Action has expired")
    }

    const stored = JSON.parse(action.payload) as {
      endpoint: string
      method: string
      body: unknown
    }
    const origin = new URL(c.req.url).origin

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    const authHeader = c.req.header("Authorization")
    const apiKeyHeader = c.req.header("X-API-Key")
    const cookie = c.req.raw.headers.get("cookie")
    if (authHeader) headers["Authorization"] = authHeader
    if (apiKeyHeader) headers["X-API-Key"] = apiKeyHeader
    if (cookie) headers["Cookie"] = cookie

    const res = await fetch(`${origin}${stored.endpoint}`, {
      method: stored.method,
      headers,
      body: JSON.stringify(stored.body),
    })
    const result = await res.json()

    await db
      .updateTable("mcp_pending_action")
      .set({ status: "approved", updatedAt: ts })
      .where("id", "=", id)
      .execute()

    return c.json({ approved: true, result })
  })

  .openapi(rejectRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db
    const ts = now()

    const action = await db
      .selectFrom("mcp_pending_action")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .where("status", "=", "pending")
      .select("id")
      .executeTakeFirst()

    if (!action) throw Errors.notFound("mcp_pending_action")
    await db
      .updateTable("mcp_pending_action")
      .set({ status: "rejected", updatedAt: ts })
      .where("id", "=", id)
      .execute()
    return c.json({ rejected: true })
  })
