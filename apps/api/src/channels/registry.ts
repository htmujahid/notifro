import type { ChannelType } from './types'
import type { ChannelAdapter } from './adapter'

const adapters = new Map<ChannelType, ChannelAdapter>()

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.type, adapter)
}

export function getAdapter(type: ChannelType): ChannelAdapter | undefined {
  return adapters.get(type)
}
