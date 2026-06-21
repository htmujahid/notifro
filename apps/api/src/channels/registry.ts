import type { ChannelAdapter } from "./adapter"
import type { ChannelType } from "./types"

const adapters = new Map<ChannelType, ChannelAdapter>()

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.type, adapter)
}

export function getAdapter(type: ChannelType): ChannelAdapter | undefined {
  return adapters.get(type)
}
