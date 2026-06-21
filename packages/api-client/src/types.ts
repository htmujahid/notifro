export interface ListParams {
  limit?: number
  cursor?: string
  sort?: string
  order?: "asc" | "desc"
  [filter: string]: string | number | boolean | undefined
}

export interface ListResponse<T> {
  data: T[]
  nextCursor: string | null
}

export interface ApiResponse<T> {
  data: T
}

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type ChannelType =
  | 'email'
  | 'webhook'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'web_push'
  | 'mobile_push'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'in_app'

type ButtonProps = {
  label: string
  url?: string
  action?: string
  style?: 'primary' | 'secondary' | 'danger'
}

export type ContentBlock =
  | { type: 'text'; text: string; markdown?: string }
  | { type: 'heading'; text: string; level?: number }
  | { type: 'image'; url: string; alt?: string; title?: string }
  | { type: 'divider' }
  | ({ type: 'button' } & ButtonProps)
  | { type: 'button_group'; buttons: ButtonProps[] }
  | { type: 'fields'; fields: Array<{ key: string; value: string }> }

export type Recipient =
  | { type: 'user'; userId: string }
  | {
      type: 'contact'
      email?: string
      phone?: string
      slackUserId?: string
      discordUserId?: string
      teamsUserId?: string
      deviceToken?: string
      pushSubscription?: Record<string, unknown>
    }
  | { type: 'segment'; segmentId: string }

export interface ComposePayload {
  schemaVersion?: '1'
  content: {
    title?: string
    subject?: string
    body: { text?: string; markdown?: string }
    blocks?: ContentBlock[]
    attachments?: Array<{
      filename: string
      contentType: string
      url?: string
      contentBase64?: string
    }>
  }
  metadata?: {
    category?: string
    priority?: Priority
    tags?: string[]
    data?: Record<string, unknown>
  }
  idempotencyKey?: string
  recipient: Recipient
  channels?: ChannelType[]
  localeHint?: string
  timezoneHint?: string
  trackOpens?: boolean
  trackClicks?: boolean
  sendAt?: string
  sendAtLocal?: string
  quietHoursStart?: string
  quietHoursEnd?: string
  deliveryWindowStart?: string
  deliveryWindowEnd?: string
  respectQuietHours?: boolean
  sendTimeOptimized?: boolean
}

export interface ScheduledMessage {
  id: string
  userId: string
  sendAt: string
  status: string
  timezone: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  deliveryWindowStart: string | null
  deliveryWindowEnd: string | null
  respectQuietHours: number
  notificationId: string | null
  recurringSendId: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringSend {
  id: string
  userId: string
  cron: string
  timezone: string
  channels: string
  nextRunAt: string
  lastRunAt: string | null
  enabled: number
  createdAt: string
  updatedAt: string
}

export interface RecipientPreferences {
  userId: string
  timezone: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  updatedAt: string
}
