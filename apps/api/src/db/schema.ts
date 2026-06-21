import type { ColumnType } from 'kysely'

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

export interface TemplateTable {
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

export interface NotificationTable {
  id: string
  userId: string
  payload: string
  subject: string | null
  channels: string
  mode: string
  status: string
  templateId: string | null
  templateData: string | null
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
  recipientId: ColumnType<string | null, string | null | undefined, string | null>
  variantId: ColumnType<string | null, string | null | undefined, string | null>
  chainId: ColumnType<string | null, string | null | undefined, string | null>
  chainStepIndex: ColumnType<number | null, number | null | undefined, number | null>
  escalatedFromDeliveryId: ColumnType<string | null, string | null | undefined, string | null>
  createdAt: string
  updatedAt: string
}

export interface FallbackChainTable {
  id: string
  userId: string
  name: string
  steps: string
  createdAt: string
  updatedAt: string
}

export interface RoutingRuleTable {
  id: string
  userId: string
  priority: number
  enabled: number
  match: string
  targetChainId: string | null
  targetChannel: string | null
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

export interface RecipientProfileTable {
  userId: string
  timezone: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  updatedAt: string
}

export interface TemplateVersionTable {
  id: string
  userId: string
  templateId: string
  version: number
  content: string
  localeStrings: string | null
  variables: string | null
  createdAt: string
}

export interface SnippetTable {
  id: string
  userId: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface BrandKitTable {
  id: string
  userId: string
  logoUrl: string | null
  colors: string | null
  fontStack: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipientTable {
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

export interface SegmentTable {
  id: string
  userId: string
  name: string
  filter: string
  createdAt: string
  updatedAt: string
}

export interface TopicTable {
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

export interface PreferenceTable {
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

export interface ChannelPriorityTable {
  id: string
  userId: string
  recipientId: string
  order: string
  createdAt: string
  updatedAt: string
}

export interface RateLimitRuleTable {
  id: string
  userId: string
  channel: string
  maxCount: number
  windowSeconds: number
  createdAt: string
  updatedAt: string
}

export interface ApikeyTable {
  id: string
  configId: string
  name: string | null
  start: string | null
  referenceId: string
  prefix: string | null
  key: string
  refillInterval: number | null
  refillAmount: number | null
  lastRefillAt: string | null
  enabled: number
  rateLimitEnabled: number
  rateLimitTimeWindow: number | null
  rateLimitMax: number | null
  requestCount: number
  remaining: number | null
  lastRequest: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  permissions: string | null
  metadata: string | null
}

export interface ApiRequestLogTable {
  id: string
  userId: string
  apiKeyId: string | null
  method: string
  path: string
  status: number
  latencyMs: number | null
  createdAt: string
}

export interface McpApprovalGateTable {
  id: string
  userId: string
  tool: string
  requiresApproval: number
  createdAt: string
  updatedAt: string
}

export interface McpPendingActionTable {
  id: string
  userId: string
  tool: string
  payload: string
  status: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface DB {
  user: UserTable
  connection: ConnectionTable
  template: TemplateTable
  template_version: TemplateVersionTable
  snippet: SnippetTable
  brand_kit: BrandKitTable
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
  recipient: RecipientTable
  segment: SegmentTable
  topic: TopicTable
  preference: PreferenceTable
  channel_priority: ChannelPriorityTable
  fallback_chain: FallbackChainTable
  routing_rule: RoutingRuleTable
  rate_limit_rule: RateLimitRuleTable
  apikey: ApikeyTable
  api_request_log: ApiRequestLogTable
  mcp_approval_gate: McpApprovalGateTable
  mcp_pending_action: McpPendingActionTable
}
