import type { AppDB } from "../db/client"

export interface PreferenceResolution {
  allowed: boolean
  reason?: string
}

export async function resolvePreferences(
  db: AppDB,
  userId: string,
  recipientId: string,
  channel: string,
  topicKey?: string
): Promise<PreferenceResolution> {
  if (topicKey) {
    const topic = await db
      .selectFrom("topic")
      .where("userId", "=", userId)
      .where("key", "=", topicKey)
      .select(["id", "transactional"])
      .executeTakeFirst()

    if (topic?.transactional) return { allowed: true }

    if (topic) {
      const topicPref = await db
        .selectFrom("preference")
        .where("recipientId", "=", recipientId)
        .where("channel", "=", channel)
        .where("topicId", "=", topic.id)
        .select("optedIn")
        .executeTakeFirst()

      if (topicPref && !topicPref.optedIn) {
        return { allowed: false, reason: `preference:${topicKey}` }
      }
    }
  }

  const globalPref = await db
    .selectFrom("preference")
    .where("recipientId", "=", recipientId)
    .where("channel", "=", channel)
    .where("topicId", "is", null)
    .select("optedIn")
    .executeTakeFirst()

  if (globalPref && !globalPref.optedIn) {
    return { allowed: false, reason: "preference:global" }
  }

  return { allowed: true }
}
