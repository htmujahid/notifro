import { z } from '@hono/zod-openapi'

const CHANNEL_TYPE_VALUES = [
  'email',
  'webhook',
  'slack',
  'discord',
  'teams',
  'web_push',
  'mobile_push',
  'sms',
  'in_app',
] as const

const ButtonPropsSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  action: z.string().optional(),
  style: z.enum(['primary', 'secondary', 'danger']).optional(),
})

export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().min(1),
    markdown: z.string().optional(),
  }),
  z.object({
    type: z.literal('heading'),
    text: z.string().min(1),
    level: z.number().int().min(1).max(6).optional().default(2),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().url(),
    alt: z.string().optional(),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('divider'),
  }),
  z.object({ type: z.literal('button') }).merge(ButtonPropsSchema),
  z.object({
    type: z.literal('button_group'),
    buttons: z.array(ButtonPropsSchema).min(1),
  }),
  z.object({
    type: z.literal('fields'),
    fields: z.array(z.object({ key: z.string(), value: z.string() })).min(1),
  }),
])

const BodySchema = z
  .object({
    text: z.string().optional(),
    markdown: z.string().optional(),
  })
  .refine((b) => b.text !== undefined || b.markdown !== undefined, {
    message: 'body must have at least one of text or markdown',
  })

const AttachmentSchema = z
  .object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    url: z.string().url().optional(),
    contentBase64: z.string().optional(),
  })
  .refine((a) => a.url !== undefined || a.contentBase64 !== undefined, {
    message: 'attachment must have either url or contentBase64',
  })

const ContentSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  body: BodySchema,
  blocks: z.array(ContentBlockSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

const MetadataSchema = z.object({
  category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  tags: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})

export const RecipientSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user'),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('contact'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    slackUserId: z.string().optional(),
    discordUserId: z.string().optional(),
    teamsUserId: z.string().optional(),
    deviceToken: z.string().optional(),
    pushSubscription: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('segment'),
    segmentId: z.string().min(1),
  }),
])

export const ComposePayloadSchema = z.object({
  schemaVersion: z.literal('1').default('1'),
  content: ContentSchema,
  metadata: MetadataSchema.optional().default({ priority: 'normal' }),
  idempotencyKey: z.string().optional(),
  recipient: RecipientSchema,
  channels: z.array(z.enum(CHANNEL_TYPE_VALUES)).optional(),
  localeHint: z.string().optional(),
  timezoneHint: z.string().optional(),
})

export type ComposePayload = z.infer<typeof ComposePayloadSchema>
export type ContentBlock = z.infer<typeof ContentBlockSchema>
export type Recipient = z.infer<typeof RecipientSchema>
