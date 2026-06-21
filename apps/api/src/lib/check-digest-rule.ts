import type { db as DbFn } from '../db/client'

type DB = ReturnType<typeof DbFn>

export type DigestRouteResult =
  | { route: 'send' }
  | { route: 'digest'; digestKey: string; schedule: string; templateId: string | null }

export async function checkDigestRule(
  database: DB,
  userId: string,
  channel: string,
  topicId?: string | null,
): Promise<DigestRouteResult> {
  const rule = await database
    .selectFrom('digest_rule')
    .where('userId', '=', userId)
    .where((eb) => eb.or([eb('channel', '=', channel), eb('channel', '=', '*')]))
    .where((eb) =>
      eb.or([
        eb('topicId', 'is', null),
        ...(topicId ? [eb('topicId', '=', topicId)] : []),
      ]),
    )
    .orderBy('topicId', 'desc')
    .selectAll()
    .executeTakeFirst()

  if (!rule) return { route: 'send' }

  return {
    route: 'digest',
    digestKey: rule.digestKey,
    schedule: rule.schedule,
    templateId: rule.templateId ?? null,
  }
}
