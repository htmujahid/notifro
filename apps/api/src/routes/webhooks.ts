import { OpenAPIHono, z } from "@hono/zod-openapi"

import { postWebhook } from "../channels/webhook/adapter"
import { generateSecret } from "../channels/webhook/sign"
import { decrypt, encrypt } from "../lib/crypto"
import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  WebhookDtoSchema,
  createRoute_,
  deleteRoute,
  listRoute,
  testRoute,
  updateRoute,
} from "./webhooks.contract"

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

type WebhookRow = {
  id: string
  userId: string
  url: string
  secret: string
  secretLast4: string
  headers: string | null
  description: string | null
  enabled: number
  createdAt: string
  updatedAt: string
}

function toDto(row: WebhookRow): z.infer<typeof WebhookDtoSchema> {
  return {
    id: row.id,
    userId: row.userId,
    url: row.url,
    secretLast4: row.secretLast4,
    headers: row.headers
      ? (JSON.parse(row.headers) as Record<string, string>)
      : null,
    description: row.description,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("webhook_endpoint")
      .where("userId", "=", userId)
      .selectAll()

    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    })

    const rows = await qb.execute()
    const page = getPage(rows as unknown as WebhookRow[])

    return c.json({ data: page.data.map(toDto), nextCursor: page.nextCursor })
  })

  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json")
    const userId = c.var.user!.id

    const secret = generateSecret()
    const id = newId()
    const ts = now()

    await c.var.db
      .insertInto("webhook_endpoint")
      .values({
        id,
        userId,
        url: body.url,
        secret: await encrypt(secret, c.env.CONNECTION_ENC_KEY),
        secretLast4: secret.slice(-4),
        headers: body.headers ? JSON.stringify(body.headers) : null,
        description: body.description ?? null,
        enabled: body.enabled ? 1 : 0,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const row = await c.var.db
      .selectFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json({ ...toDto(row as WebhookRow), secret }, 201)
  })

  .openapi(updateRoute, async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid("json")
    const userId = c.var.user!.id

    const existing = await c.var.db
      .selectFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Webhook endpoint")

    const updates: Record<string, unknown> = { updatedAt: now() }
    if (body.url !== undefined) updates.url = body.url
    if (body.description !== undefined) updates.description = body.description
    if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0
    if (body.headers !== undefined)
      updates.headers = body.headers ? JSON.stringify(body.headers) : null

    await c.var.db
      .updateTable("webhook_endpoint")
      .set(updates)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    const row = await c.var.db
      .selectFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    return c.json(toDto(row as WebhookRow))
  })

  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const existing = await c.var.db
      .selectFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (!existing) throw Errors.notFound("Webhook endpoint")

    await c.var.db
      .deleteFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()

    return c.json({ ok: true })
  })

  .openapi(testRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const row = await c.var.db
      .selectFrom("webhook_endpoint")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!row) throw Errors.notFound("Webhook endpoint")

    const secret = await decrypt(row.secret, c.env.CONNECTION_ENC_KEY)
    const headers = row.headers
      ? (JSON.parse(row.headers) as Record<string, string>)
      : null

    const sampleBody = JSON.stringify({
      schemaVersion: "1",
      event: "webhook.test",
      content: {
        title: "Renderical test",
        body: { text: "This is a test webhook delivery." },
      },
      recipient: { type: "user", userId },
      sentAt: now(),
    })

    const result = await postWebhook(
      row.url,
      secret,
      sampleBody,
      newId(),
      headers
    )

    return c.json({
      ok: result.ok,
      status: result.status,
      latencyMs: result.latencyMs,
      error: result.error,
    })
  })
