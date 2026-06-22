import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const failoverKeys = {
  all: ["providerFallbacks"] as const,
  list: () => [...failoverKeys.all, "list"] as const,
}

export function useProviderFallbacks() {
  const client = useApiClient()
  return useQuery({
    queryKey: failoverKeys.list(),
    queryFn: () => unwrap(client.api["provider-fallbacks"].$get()),
  })
}

export function useCreateProviderFallback() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      primaryConnectionId: string
      fallbackConnectionId: string
    }) => unwrap(client.api["provider-fallbacks"].$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: failoverKeys.all }),
  })
}

export function useDeleteProviderFallback() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        client.api["provider-fallbacks"][":id"].$delete({ param: { id } })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: failoverKeys.all }),
  })
}
