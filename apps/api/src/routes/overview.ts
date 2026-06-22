import { OpenAPIHono } from "@hono/zod-openapi"

import { getAdapter } from "../channels/registry"
import type { Connection } from "../channels/types"
import { validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  onboardingPatchRoute,
  overviewRoute,
  testSendRoute,
} from "./overview.contract"

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(overviewRoute, async (c) => {
    const userId = c.var.user!.id
    const db = c.var.db

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    const [
      channelRow,
      sent7dRow,
      sent30dRow,
      totalDeliveriesRow,
      successDeliveriesRow,
      recentRows,
      unreadRow,
      onboardingRow,
    ] = await Promise.all([
      db
        .selectFrom("connection")
        .where("userId", "=", userId)
        .where("status", "=", "active")
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("notification")
        .where("userId", "=", userId)
        .where("createdAt", ">=", sevenDaysAgo)
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("notification")
        .where("userId", "=", userId)
        .where("createdAt", ">=", thirtyDaysAgo)
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("delivery")
        .where("userId", "=", userId)
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("delivery")
        .where("userId", "=", userId)
        .where("status", "=", "delivered")
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("notification")
        .where("userId", "=", userId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .select(["id", "subject", "channels", "status", "createdAt"])
        .execute(),
      db
        .selectFrom("inbox_message")
        .where("userId", "=", userId)
        .where("readAt", "is", null)
        .select(db.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
      db
        .selectFrom("onboarding_state")
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst(),
    ])

    const channels = Number(channelRow?.n ?? 0)
    const sent7d = Number(sent7dRow?.n ?? 0)
    const sent30d = Number(sent30dRow?.n ?? 0)
    const total = Number(totalDeliveriesRow?.n ?? 0)
    const delivered = Number(successDeliveriesRow?.n ?? 0)
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 100
    const unreadInbox = Number(unreadRow?.n ?? 0)

    const completedSteps = onboardingRow
      ? (JSON.parse(onboardingRow.completedSteps) as string[])
      : []
    const dismissed = Boolean(onboardingRow?.dismissed)

    const steps = {
      connect_channel: channels > 0,
      send_test: delivered > 0,
      explore_templates: completedSteps.includes("explore_templates"),
    }

    const onboarding = {
      complete:
        steps.connect_channel && steps.send_test && steps.explore_templates,
      dismissed,
      steps,
    }

    return c.json({
      channels,
      sent7d,
      sent30d,
      successRate,
      recentActivity: recentRows.map((r) => ({
        id: r.id,
        subject: r.subject,
        channels: r.channels,
        status: r.status,
        createdAt: r.createdAt,
      })),
      unreadInbox,
      onboarding,
    })
  })

  .openapi(testSendRoute, async (c) => {
    const userId = c.var.user!.id
    const db = c.var.db

    const adapter = getAdapter("in_app")!
    const ts = now()
    const notifId = newId()

    const payload = {
      schemaVersion: "1" as const,
      recipient: { type: "user" as const, userId },
      channels: ["in_app" as const],
      content: {
        title: "Test notification",
        body: {
          text: "Your Renderical setup is working. Notifications are delivering successfully.",
        },
      },
      metadata: { priority: "normal" as const },
      trackOpens: false,
      trackClicks: false,
      respectQuietHours: true,
    }

    const syntheticConn: Connection = {
      id: "in_app",
      userId,
      type: "in_app",
      name: "In-app",
      status: "active",
      config: "{}",
      credentials: null,
      metadata: null,
      health: null,
      lastUsedAt: null,
      createdAt: ts,
      updatedAt: ts,
    }

    await db
      .insertInto("notification")
      .values({
        id: notifId,
        userId,
        payload: JSON.stringify(payload),
        subject: "Test notification",
        channels: JSON.stringify(["in_app"]),
        mode: "transactional",
        status: "processing",
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const provider = adapter.transform(payload, { connection: syntheticConn })
    const result = await adapter.send(provider as never, syntheticConn, {
      db,
      notificationId: notifId,
    })

    const deliveryId = newId()
    const dts = now()
    await db
      .insertInto("delivery")
      .values({
        id: deliveryId,
        userId,
        notificationId: notifId,
        channel: "in_app",
        recipient: userId,
        status: result.ok ? "delivered" : "failed",
        providerMessageId: result.providerMessageId,
        error: result.ok ? null : (result.error ?? "Unknown error"),
        attempts: 1,
        createdAt: dts,
        updatedAt: dts,
      })
      .execute()

    await db
      .updateTable("notification")
      .set({ status: result.ok ? "completed" : "failed", updatedAt: now() })
      .where("id", "=", notifId)
      .execute()

    return c.json({ ok: result.ok, notificationId: notifId })
  })

  .openapi(onboardingPatchRoute, async (c) => {
    const userId = c.var.user!.id
    const db = c.var.db
    const body = c.req.valid("json")
    const ts = now()

    const existing = await db
      .selectFrom("onboarding_state")
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!existing) {
      await db
        .insertInto("onboarding_state")
        .values({
          userId,
          completedSteps: "[]",
          dismissed: 0,
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()
    }

    const updates: Record<string, unknown> = { updatedAt: ts }

    if (body.dismiss === true) {
      updates.dismissed = 1
    }

    if (body.step !== undefined && body.completed !== undefined) {
      const current = existing
        ? (JSON.parse(existing.completedSteps) as string[])
        : []
      const next = body.completed
        ? Array.from(new Set([...current, body.step]))
        : current.filter((s) => s !== body.step)
      updates.completedSteps = JSON.stringify(next)
    }

    await db
      .updateTable("onboarding_state")
      .set(updates)
      .where("userId", "=", userId)
      .execute()

    return c.json({ ok: true })
  })
