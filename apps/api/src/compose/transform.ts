import type { ChannelType } from '../channels/types'
import type { Connection } from '../channels/types'
import type { ComposePayload } from './schema'

export type ChannelTransformCtx = { connection: Connection | null }

export type ChannelTransform<Provider = unknown> = (
  payload: ComposePayload,
  ctx: ChannelTransformCtx,
) => Provider

function notImplemented(type: ChannelType): never {
  throw new Error(`channel_not_implemented: ${type}`)
}

const stubTransforms: Record<ChannelType, ChannelTransform> = {
  email: (_, _ctx) => notImplemented('email'),
  web_push: (_, _ctx) => notImplemented('web_push'),
  sms: (_, _ctx) => notImplemented('sms'),
  whatsapp: (_, _ctx) => notImplemented('whatsapp'),
  telegram: (_, _ctx) => notImplemented('telegram'),
  slack: (_, _ctx) => notImplemented('slack'),
  webhook: (payload) => payload as unknown,
  in_app: (payload) => payload as unknown,
}

const registry = new Map<ChannelType, ChannelTransform>(
  Object.entries(stubTransforms) as [ChannelType, ChannelTransform][],
)

export function registerTransform<Provider>(
  type: ChannelType,
  transform: ChannelTransform<Provider>,
): void {
  registry.set(type, transform as ChannelTransform)
}

export function getTransform(type: ChannelType): ChannelTransform {
  const transform = registry.get(type)
  if (!transform) notImplemented(type)
  return transform
}
