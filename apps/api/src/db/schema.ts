export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface UserTable {
  id: string
  name: string
  email: string
  emailVerified: number
  image: string | null
  phoneNumber: string | null
  phoneNumberVerified: number
}

export interface ConnectionTable {
  id: string
  userId: string
  type: string
  name: string
  status: string
  config: string
  credentials: string | null
  scopes: string
  health: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationTable {
  id: string
  userId: string
  payload: string
  subject: string | null
  channels: string
  mode: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryTable {
  id: string
  userId: string
  notificationId: string
  channel: string
  recipient: string
  status: string
  providerMessageId: string | null
  error: string | null
  attempts: number
  nextRetryAt: string | null
  lastError: string | null
  deliveredAt: string | null
  openedAt: string | null
  clickedAt: string | null
  bouncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DeliveryEventTable {
  id: string
  deliveryId: string
  userId: string
  type: string
  at: string
  meta: string
}

export interface IdempotencyKeyTable {
  userId: string
  key: string
  notificationId: string
  expiresAt: string
  createdAt: string
}

export interface DeadLetterTable {
  id: string
  userId: string
  deliveryId: string
  notificationId: string
  channel: string
  reason: string
  errorCode: string | null
  payload: string
  error: string
  attempts: number
  failedAt: string
  createdAt: string
}

export interface InboxMessageTable {
  id: string
  userId: string
  notificationId: string | null
  deliveryId: string | null
  title: string
  body: string | null
  icon: string | null
  url: string | null
  seenAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OnboardingStateTable {
  userId: string
  completedSteps: string
  dismissed: number
  createdAt: string
  updatedAt: string
}

export interface PushSubscriptionTable {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
  updatedAt: string
}

export interface DeviceTokenTable {
  id: string
  userId: string
  platform: string
  token: string
  active: number
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface WebhookEndpointTable {
  id: string
  userId: string
  url: string
  secret: string
  secretLast4: string
  headers: string | null
  description: string | null
  enabled: number
  createdAt: string
  updatedAt: string
}

export interface ScheduledMessageTable {
  id: string
  userId: string
  payload: string
  channels: string
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

export interface RecurringSendTable {
  id: string
  userId: string
  payload: string
  channels: string
  cron: string
  timezone: string
  nextRunAt: string
  lastRunAt: string | null
  enabled: number
  createdAt: string
  updatedAt: string
}

export interface RecipientSendTimeTable {
  userId: string
  bestHourLocal: number
  confidence: number
  computedAt: string
}

export interface RecipientProfileTable {
  userId: string
  timezone: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  updatedAt: string
}

export interface DB {
  user: UserTable
  connection: ConnectionTable
  notification: NotificationTable
  delivery: DeliveryTable
  delivery_event: DeliveryEventTable
  inbox_message: InboxMessageTable
  onboarding_state: OnboardingStateTable
  push_subscription: PushSubscriptionTable
  webhook_endpoint: WebhookEndpointTable
  device_token: DeviceTokenTable
  idempotency_key: IdempotencyKeyTable
  dead_letter: DeadLetterTable
  scheduled_message: ScheduledMessageTable
  recipient_profile: RecipientProfileTable
  recurring_send: RecurringSendTable
  recipient_send_time: RecipientSendTimeTable
}
