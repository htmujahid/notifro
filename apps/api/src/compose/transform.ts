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
  email: (_, ctx) => notImplemented('email'),
  slack: (_, ctx) => notImplemented('slack'),
  discord: (_, ctx) => notImplemented('discord'),
  teams: (_, ctx) => notImplemented('teams'),
  web_push: (_, ctx) => notImplemented('web_push'),
  mobile_push: (_, ctx) => notImplemented('mobile_push'),
  sms: (_, ctx) => notImplemented('sms'),
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
