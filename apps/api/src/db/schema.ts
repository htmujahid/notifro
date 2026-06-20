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
  createdAt: string
  updatedAt: string
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

export interface DB {
  user: UserTable
  connection: ConnectionTable
  notification: NotificationTable
  delivery: DeliveryTable
  inbox_message: InboxMessageTable
  onboarding_state: OnboardingStateTable
  push_subscription: PushSubscriptionTable
  webhook_endpoint: WebhookEndpointTable
}
