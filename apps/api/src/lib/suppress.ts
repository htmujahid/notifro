import type { AppDB } from "../db/client"

function sourceFromReason(reason: string): string {
  if (reason === "hard_bounce" || reason === "complaint")
    return "bounce_webhook"
  if (reason === "unsubscribe") return "unsubscribe_link"
  return "api"
}

export async function suppress(
  db: AppDB,
  userId: string,
  channel: string,
  address: string,
  reason: string,
  recipientId?: string | null,
  topicId?: string | null
): Promise<void> {
  const ts = new Date().toISOString()
  await db
    .insertInto("suppression")
    .values({
      id: crypto.randomUUID(),
      userId,
      channel,
      address,
      reason,
      createdAt: ts,
    })
    .onConflict((oc) => oc.doNothing())
    .execute()
  await db
    .insertInto("consent_event")
    .values({
      id: crypto.randomUUID(),
      userId,
      recipientId: recipientId ?? null,
      channel,
      topicId: topicId ?? null,
      event: "opt_out",
      source: sourceFromReason(reason),
      actorNote: null,
      createdAt: ts,
    })
    .execute()
}

export async function isSuppressed(
  db: AppDB,
  userId: string,
  channel: string,
  address: string
): Promise<{ reason: string } | null> {
  if (!address) return null
  return (
    (await db
      .selectFrom("suppression")
      .where("userId", "=", userId)
      .where("channel", "=", channel)
      .where("address", "=", address)
      .select("reason")
      .executeTakeFirst()) ?? null
  )
}

export async function recordConsentEvent(
  db: AppDB,
  userId: string,
  channel: string,
  event: "opt_in" | "opt_out",
  source: string,
  recipientId?: string | null,
  topicId?: string | null
): Promise<void> {
  await db
    .insertInto("consent_event")
    .values({
      id: crypto.randomUUID(),
      userId,
      recipientId: recipientId ?? null,
      channel,
      topicId: topicId ?? null,
      event,
      source,
      actorNote: null,
      createdAt: new Date().toISOString(),
    })
    .execute()
}
