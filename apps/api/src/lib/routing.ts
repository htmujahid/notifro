import type { db } from "../db/client"

export interface ChainStep {
  channel: string
  connectionId?: string
  waitForDeliveryMs: number
  successOn: ("delivered" | "opened" | "clicked")[]
}

export interface MatchCondition {
  messageType?: string
  minPriority?: string
  recipientAttr?: { field: string; op: string; value: unknown }
  timeWindow?: { start: string; end: string }
}

export type RouteResult =
  | { type: "channel"; channel: string }
  | { type: "chain"; chainId: string; steps: ChainStep[] }
  | null

export interface NotificationInput {
  priority?: string
  messageType?: string
}

const PRIORITY_ORDER = ["low", "normal", "high", "urgent"]

function matchesPriority(minPriority: string, actual: string): boolean {
  return PRIORITY_ORDER.indexOf(actual) >= PRIORITY_ORDER.indexOf(minPriority)
}

function matchesTimeWindow(start: string, end: string): boolean {
  const now = new Date()
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes()
  const startMins = (sh ?? 0) * 60 + (sm ?? 0)
  const endMins = (eh ?? 0) * 60 + (em ?? 0)
  return nowMins >= startMins && nowMins <= endMins
}

function evaluateMatch(
  match: MatchCondition,
  notification: NotificationInput
): boolean {
  if (match.minPriority) {
    const priority = notification.priority ?? "normal"
    if (!matchesPriority(match.minPriority, priority)) return false
  }
  if (
    match.messageType !== undefined &&
    notification.messageType !== match.messageType
  )
    return false
  if (
    match.timeWindow &&
    !matchesTimeWindow(match.timeWindow.start, match.timeWindow.end)
  )
    return false
  return true
}

export async function resolveRoute(
  database: ReturnType<typeof db>,
  userId: string,
  notification: NotificationInput
): Promise<RouteResult> {
  const rules = await database
    .selectFrom("routing_rule")
    .where("userId", "=", userId)
    .where("enabled", "=", 1)
    .orderBy("priority", "asc")
    .selectAll()
    .execute()

  for (const rule of rules) {
    const match = JSON.parse(rule.match) as MatchCondition
    if (!evaluateMatch(match, notification)) continue

    if (rule.targetChainId) {
      const chain = await database
        .selectFrom("fallback_chain")
        .where("id", "=", rule.targetChainId)
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst()
      if (!chain) continue
      const steps = JSON.parse(chain.steps) as ChainStep[]
      if (steps.length === 0) continue
      return { type: "chain", chainId: chain.id, steps }
    }

    if (rule.targetChannel) {
      return { type: "channel", channel: rule.targetChannel }
    }
  }

  return null
}

export async function escalateChain(
  database: ReturnType<typeof db>,
  env: CloudflareBindings,
  deliveryId: string,
  notificationId: string,
  userId: string,
  chainId: string,
  currentStepIndex: number,
  ts: string
): Promise<void> {
  const chain = await database
    .selectFrom("fallback_chain")
    .where("id", "=", chainId)
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirst()

  if (!chain) return

  const steps = JSON.parse(chain.steps) as ChainStep[]
  const nextStepIndex = currentStepIndex + 1

  if (nextStepIndex >= steps.length || nextStepIndex >= 10) return

  const idempotencyKey = `chain:${notificationId}:${nextStepIndex}`
  const existing = await database
    .selectFrom("idempotency_key")
    .where("userId", "=", userId)
    .where("key", "=", idempotencyKey)
    .select("notificationId")
    .executeTakeFirst()

  if (existing) return

  const nextStep = steps[nextStepIndex]!
  const nextDeliveryId = crypto.randomUUID()

  const notification = await database
    .selectFrom("notification")
    .where("id", "=", notificationId)
    .select(["payload"])
    .executeTakeFirst()

  if (!notification) return

  const payload = JSON.parse(notification.payload) as Record<string, unknown>
  const recipient =
    (payload.recipient as Record<string, unknown> | undefined) ?? {}

  let recipientAddr = ""
  if (recipient.type === "contact" && recipient.email) {
    recipientAddr = recipient.email as string
  } else if (recipient.type === "contact" && recipient.phone) {
    recipientAddr = recipient.phone as string
  } else if (recipient.type === "user" && recipient.userId) {
    const user = await database
      .selectFrom("user")
      .where("id", "=", recipient.userId as string)
      .select("email")
      .executeTakeFirst()
    recipientAddr = user?.email ?? ""
  }

  await database
    .insertInto("delivery")
    .values({
      id: nextDeliveryId,
      userId,
      notificationId,
      channel: nextStep.channel,
      recipient: recipientAddr,
      status: "queued",
      providerMessageId: null,
      error: null,
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      bouncedAt: null,
      chainId,
      chainStepIndex: nextStepIndex,
      escalatedFromDeliveryId: deliveryId,
      createdAt: ts,
      updatedAt: ts,
    })
    .execute()

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await database
    .insertInto("idempotency_key")
    .values({
      userId,
      key: idempotencyKey,
      notificationId,
      expiresAt,
      createdAt: ts,
    })
    .onConflict((oc) => oc.doNothing())
    .execute()

  await env.DELIVERY_Q.send({
    deliveryId: nextDeliveryId,
    notificationId,
    userId,
    channel: nextStep.channel,
  })
}
