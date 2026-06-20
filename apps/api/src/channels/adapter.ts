import type { ChannelType, ComposePayload, Connection, SendResult, ReceiptUpdate, HealthResult } from './types'
import type { AppDB } from '../db/client'

export interface SendContext {
  db: AppDB
  notificationId?: string
}

export interface ChannelAdapter<Config = unknown, Provider = unknown> {
  type: ChannelType
  validateConfig(input: unknown): Config
  transform(payload: ComposePayload, ctx: { connection: Connection }): Provider
  send(provider: Provider, conn: Connection, ctx: SendContext): Promise<SendResult>
  parseReceipt?(raw: unknown): ReceiptUpdate
  healthCheck?(conn: Connection): Promise<HealthResult>
}
