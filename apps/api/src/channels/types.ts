export type ChannelType =
  | 'email'
  | 'webhook'
  | 'web_push'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'in_app'

export const CHANNEL_TYPES: ChannelType[] = [
  'email',
  'webhook',
  'web_push',
  'sms',
  'whatsapp',
  'telegram',
  'slack',
  'discord',
  'teams',
  'in_app',
]

export type ConnectionStatus = 'active' | 'disabled' | 'needs_reauth' | 'error'

export const CONNECTION_STATUSES: ConnectionStatus[] = [
  'active',
  'disabled',
  'needs_reauth',
  'error',
]

export interface Connection {
  id: string
  userId: string
  type: ChannelType
  name: string
  status: ConnectionStatus
  config: string
  credentials: string | null
  scopes: string
  health: string | null
  createdAt: string
  updatedAt: string
}

export interface SendResult {
  providerMessageId: string | null
  ok: boolean
  error?: string
}

export interface ReceiptUpdate {
  providerMessageId: string
  status: 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed'
  timestamp: string
  raw?: unknown
}

export interface HealthResult {
  ok: boolean
  message?: string
  checkedAt: string
}

export type { ComposePayload } from '../compose/schema'
