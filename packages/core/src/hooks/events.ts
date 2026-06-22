import { useMutation } from "@tanstack/react-query"

import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export interface TrackEventInput {
  name: string
  recipientId?: string
  payload?: Record<string, unknown>
}

export interface TrackEventResult {
  eventId: string
  journeysTriggered: number
}

export const eventKeys = {
  all: ["events"] as const,
}

export function useTrackEvent() {
  const client = useApiClient()
  return useMutation({
    mutationFn: (input: TrackEventInput) =>
      unwrap(client.api.events.$post({ json: input })) as Promise<TrackEventResult>,
  })
}
