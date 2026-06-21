import type { AppDB } from '../db/client'
import { resolveSendConnection } from '../channels/resolve'
import { getAdapter } from '../channels/registry'
import type { ChannelType } from '../channels/types'
import type { DeliveryQueueMessage } from '../queue/consumer'

export type StepKind = 'send' | 'wait' | 'branch' | 'exit'

export type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'

export type FilterClause = {
  field: string
  op: FilterOp
  value: string | number | boolean | null | (string | number)[]
}

export type FilterNode =
  | { and: FilterNode[] }
  | { or: FilterNode[] }
  | FilterClause

export type JourneyStep = {
  kind: StepKind
  config: Record<string, unknown>
  next?: string | null
  branches?: { condition: FilterNode; next: string }[]
}

export type JourneySteps = Record<string, JourneyStep>

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function evaluateFilter(node: FilterNode, context: Record<string, unknown>): boolean {
  if ('and' in node) {
    return (node as { and: FilterNode[] }).and.every((n) => evaluateFilter(n, context))
  }
  if ('or' in node) {
    return (node as { or: FilterNode[] }).or.some((n) => evaluateFilter(n, context))
  }
  const c = node as FilterClause
  const val = getPath(context, c.field)
  switch (c.op) {
    case 'eq': return val === c.value
    case 'neq': return val !== c.value
    case 'gt': return typeof val === 'number' && typeof c.value === 'number' && val > c.value
    case 'lt': return typeof val === 'number' && typeof c.value === 'number' && val < c.value
    case 'gte': return typeof val === 'number' && typeof c.value === 'number' && val >= c.value
    case 'lte': return typeof val === 'number' && typeof c.value === 'number' && val <= c.value
    case 'contains': return typeof val === 'string' && typeof c.value === 'string' && val.includes(c.value)
    case 'in': {
      const vals = Array.isArray(c.value) ? c.value : [c.value]
      return vals.includes(val as string | number)
    }
    default: return false
  }
}

const MAX_STEPS = 50

export async function advanceJourneyRun(
  run: {
    id: string
    userId: string
    journeyId: string
    recipientId: string
    currentStepId: string
    context: string
    status: string
  },
  database: AppDB,
  env: CloudflareBindings,
  depth = 0,
): Promise<void> {
  if (depth >= MAX_STEPS) return

  const journey = await database
    .selectFrom('journey')
    .where('id', '=', run.journeyId)
    .where('userId', '=', run.userId)
    .selectAll()
    .executeTakeFirst()

  if (!journey) return

  const steps = JSON.parse(journey.steps) as JourneySteps
  const step = steps[run.currentStepId]
  if (!step) return

  const ts = new Date().toISOString()
  const context = JSON.parse(run.context) as Record<string, unknown>

  if (step.kind === 'exit') {
    await database
      .updateTable('journey_run')
      .set({ status: 'completed', updatedAt: ts })
      .where('id', '=', run.id)
      .execute()
    return
  }

  if (step.kind === 'wait') {
    const delayMs = (step.config.delayMs as number) ?? 0
    const resumeAt = new Date(Date.now() + delayMs).toISOString()
    await database
      .updateTable('journey_run')
      .set({ nextResumeAt: resumeAt, updatedAt: ts })
      .where('id', '=', run.id)
      .execute()
    return
  }

  if (step.kind === 'send') {
    const payload = step.config.payload as Record<string, unknown>
    const channels = (step.config.channels as string[]) ?? ['email']
    const idempotencyKey = `journey:${run.id}:${run.currentStepId}`

    const existing = await database
      .selectFrom('idempotency_key')
      .where('userId', '=', run.userId)
      .where('key', '=', idempotencyKey)
      .selectAll()
      .executeTakeFirst()

    if (!existing) {
      const notifId = crypto.randomUUID()
      const subject = (payload.content as Record<string, unknown> | undefined)?.subject as string ??
        (payload.content as Record<string, unknown> | undefined)?.title as string ?? null

      await database
        .insertInto('notification')
        .values({
          id: notifId,
          userId: run.userId,
          payload: JSON.stringify(payload),
          subject,
          channels: JSON.stringify(channels),
          mode: 'transactional',
          status: 'queued',
          templateId: null,
          templateData: null,
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()

      for (const channel of channels) {
        const deliveryId = crypto.randomUUID()
        const dts = new Date().toISOString()
        const adapter = getAdapter(channel as ChannelType)
        const conn = await resolveSendConnection(database, run.userId, channel as ChannelType, dts)

        if (!adapter || !conn) {
          await database
            .insertInto('delivery')
            .values({
              id: deliveryId, userId: run.userId, notificationId: notifId,
              channel, recipient: '', status: 'failed',
              providerMessageId: null, error: adapter ? `No active ${channel} connection` : `No adapter: ${channel}`,
              attempts: 1, nextRetryAt: null, lastError: null,
              deliveredAt: null, openedAt: null, clickedAt: null, bouncedAt: null,
              recipientId: run.recipientId, variantId: null,
              chainId: null, chainStepIndex: null, escalatedFromDeliveryId: null,
              createdAt: dts, updatedAt: dts,
            })
            .execute()
          continue
        }

        await database
          .insertInto('delivery')
          .values({
            id: deliveryId, userId: run.userId, notificationId: notifId,
            channel, recipient: '', status: 'queued',
            providerMessageId: null, error: null, attempts: 0,
            nextRetryAt: null, lastError: null,
            deliveredAt: null, openedAt: null, clickedAt: null, bouncedAt: null,
            recipientId: run.recipientId, variantId: null,
            chainId: null, chainStepIndex: null, escalatedFromDeliveryId: null,
            createdAt: dts, updatedAt: dts,
          })
          .execute()

        const queueMsg: DeliveryQueueMessage = { deliveryId, notificationId: notifId, userId: run.userId, channel }
        await env.DELIVERY_Q.send(queueMsg)
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await database
        .insertInto('idempotency_key')
        .values({ userId: run.userId, key: idempotencyKey, notificationId: notifId, expiresAt, createdAt: ts })
        .execute()
    }

    if (step.next) {
      await database
        .updateTable('journey_run')
        .set({ currentStepId: step.next, nextResumeAt: null, updatedAt: ts })
        .where('id', '=', run.id)
        .execute()

      await advanceJourneyRun({ ...run, currentStepId: step.next }, database, env, depth + 1)
    } else {
      await database
        .updateTable('journey_run')
        .set({ status: 'completed', updatedAt: ts })
        .where('id', '=', run.id)
        .execute()
    }
    return
  }

  if (step.kind === 'branch') {
    const branches = (step.config.branches as { condition: FilterNode; next: string }[]) ?? []
    const defaultNext = step.config.default as string | undefined
    let matched = defaultNext ?? null

    for (const branch of branches) {
      if (evaluateFilter(branch.condition, context)) {
        matched = branch.next
        break
      }
    }

    if (!matched) {
      await database
        .updateTable('journey_run')
        .set({ status: 'completed', updatedAt: ts })
        .where('id', '=', run.id)
        .execute()
      return
    }

    await database
      .updateTable('journey_run')
      .set({ currentStepId: matched, nextResumeAt: null, updatedAt: ts })
      .where('id', '=', run.id)
      .execute()

    await advanceJourneyRun({ ...run, currentStepId: matched }, database, env, depth + 1)
  }
}
