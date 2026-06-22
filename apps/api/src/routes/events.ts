import { OpenAPIHono } from "@hono/zod-openapi"

import { validationHook } from "../lib/errors"
import { advanceJourneyRun } from "../lib/journey-engine"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import { triggerRoute } from "./events.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router.openapi(triggerRoute, async (c) => {
  const { name, recipientId, payload } = c.req.valid("json")
  const { db } = c.var
  const userId = c.var.user!.id
  const ts = new Date().toISOString()

  const eventId = crypto.randomUUID()
  await db
    .insertInto("journey_event")
    .values({
      id: eventId,
      userId,
      name,
      recipientId: recipientId ?? null,
      payload: JSON.stringify(payload),
      createdAt: ts,
    })
    .execute()

  const activeJourneys = await db
    .selectFrom("journey")
    .where("userId", "=", userId)
    .where("status", "=", "active")
    .selectAll()
    .execute()

  let journeysTriggered = 0

  for (const journey of activeJourneys) {
    if (!journey.trigger) continue
    let trigger: Record<string, unknown>
    try {
      trigger = JSON.parse(journey.trigger) as Record<string, unknown>
    } catch {
      continue
    }
    if (trigger.type !== "event" || trigger.event !== name) continue

    let resolvedRecipientId = recipientId
    if (!resolvedRecipientId) continue

    const recipient = await db
      .selectFrom("recipient")
      .where("id", "=", resolvedRecipientId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!recipient) continue

    const steps = JSON.parse(journey.steps) as Record<string, { kind: string }>
    const firstStepId = Object.keys(steps)[0]
    if (!firstStepId) continue

    const runId = crypto.randomUUID()
    try {
      await db
        .insertInto("journey_run")
        .values({
          id: runId,
          userId,
          journeyId: journey.id,
          recipientId: resolvedRecipientId,
          status: "active",
          currentStepId: firstStepId,
          nextResumeAt: null,
          context: JSON.stringify({
            ...(recipient.attributes
              ? JSON.parse(recipient.attributes as string)
              : {}),
            payload,
          }),
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()
    } catch {
      continue
    }

    const run = await db
      .selectFrom("journey_run")
      .where("id", "=", runId)
      .selectAll()
      .executeTakeFirst()

    if (run) {
      await advanceJourneyRun(run, db, c.env)
    }

    journeysTriggered++
  }

  return c.json({ eventId, journeysTriggered })
})
