import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const recipientProfileKeys = {
  all: ["recipient-profiles"] as const,
  profile: () => [...recipientProfileKeys.all] as const,
}

export function useRecipientProfile() {
  const client = useApiClient()
  return useQuery({
    queryKey: recipientProfileKeys.profile(),
    queryFn: () => unwrap(client.api.recipients.preferences.$get()),
  })
}

export function useUpdateRecipientProfile() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["recipients"]["preferences"]["$patch"]>["json"]) =>
      unwrap(client.api.recipients.preferences.$patch({ json: body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipientProfileKeys.all })
    },
  })
}
