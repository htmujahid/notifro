import type { AppDB } from '../db/client'
import type { Connection, ChannelType } from './types'

const SYNTHETIC_CHANNELS: ChannelType[] = ['email', 'in_app', 'web_push', 'webhook']

function synthetic(userId: string, type: ChannelType, ts: string): Connection {
  const names: Record<ChannelType, string> = {
    email: 'Email',
    in_app: 'In-app',
    web_push: 'Web Push',
    webhook: 'Webhook',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    slack: 'Slack',
    discord: 'Discord',
    teams: 'Teams',
    mobile_push: 'Mobile Push',
  }
  return {
    id: type,
    userId,
    type,
    name: names[type] ?? type,
    status: 'active',
    config: '{}',
    credentials: null,
    scopes: '[]',
    health: null,
    createdAt: ts,
    updatedAt: ts,
  }
}

export async function resolveSendConnection(
  db: AppDB,
  userId: string,
  channel: ChannelType,
  ts: string,
): Promise<Connection | null> {
  if (SYNTHETIC_CHANNELS.includes(channel)) return synthetic(userId, channel, ts)

  const row = await db
    .selectFrom('connection')
    .where('userId', '=', userId)
    .where('type', '=', channel)
    .where('status', '=', 'active')
    .selectAll()
    .executeTakeFirst()

  if (!row) return null
  return row as Connection
}
