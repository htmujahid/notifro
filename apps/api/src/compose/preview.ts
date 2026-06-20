import type { ChannelType } from '../channels/types'
import type { ComposePayload } from './schema'
import { getTransform } from './transform'

export function renderPreview(payload: ComposePayload, type: ChannelType): unknown {
  const transform = getTransform(type)
  try {
    return transform(payload, { connection: null })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('channel_not_implemented:')) {
      return { _stub: true, type, message: e.message }
    }
    throw e
  }
}
