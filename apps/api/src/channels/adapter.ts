import type { ChannelType, ComposePayload, Connection, SendResult, ReceiptUpdate, HealthResult } from './types'
import type { AppDB } from '../db/client'

export interface SendContext {
  db: AppDB
  notificationId?: string
  deliveryId?: string
  recipientId?: string
  env?: Pick<CloudflareBindings, 'VAPID_PUBLIC_KEY' | 'VAPID_PRIVATE_KEY' | 'VAPID_SUBJECT' | 'CONNECTION_ENC_KEY' | 'BETTER_AUTH_URL' | 'APNS_RELAY_URL'>
}

export interface ChannelAdapter<Config = unknown, Provider = unknown> {
  type: ChannelType
  validateConfig(input: unknown): Config
  transform(payload: ComposePayload, ctx: { connection: Connection }): Provider
  send(provider: Provider, conn: Connection, ctx: SendContext): Promise<SendResult>
  parseReceipt?(raw: unknown): ReceiptUpdate
  healthCheck?(conn: Connection): Promise<HealthResult>
}
