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

export interface Template {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  defaultLocale: string
  content: string
  variables: string | null
  localeStrings: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  userId: string
  templateId: string
  version: number
  content: string
  localeStrings: string | null
  variables: string | null
  createdAt: string
}

export interface Snippet {
  id: string
  userId: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface BrandKit {
  id: string
  userId: string
  logoUrl: string | null
  colors: string | null
  fontStack: string | null
  createdAt: string
  updatedAt: string
}

export interface ComposePayload {
  schemaVersion?: '1'
  content?: {
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
  templateId?: string
  templateSlug?: string
  templateData?: Record<string, unknown>
  templateLocale?: string
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
  topicKey?: string
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

export interface RecipientRecord {
  id: string
  userId: string
  externalId: string | null
  email: string | null
  phone: string | null
  locale: string | null
  timezone: string | null
  attributes: string | null
  createdAt: string
  updatedAt: string
}

export interface Segment {
  id: string
  userId: string
  name: string
  filter: string
  createdAt: string
  updatedAt: string
}

export interface SegmentPreview {
  count: number
  sample: { id: string; email: string | null }[]
}

export interface Topic {
  id: string
  userId: string
  key: string
  name: string
  description: string | null
  defaultOptIn: number
  transactional: number
  createdAt: string
  updatedAt: string
}

export interface Preference {
  id: string
  userId: string
  recipientId: string
  channel: string
  topicId: string | null
  optedIn: number
  source: string
  createdAt: string
  updatedAt: string
}

export interface ChannelPriority {
  id: string
  userId: string
  recipientId: string
  order: string[]
  createdAt: string
  updatedAt: string
}

export interface PreferenceCenter {
  recipientId: string
  topics: Array<{
    topicId: string
    key: string
    name: string
    description: string | null
    transactional: number
    channels: Array<{ channel: string; optedIn: boolean }>
  }>
  globalOptOut: string[]
}
