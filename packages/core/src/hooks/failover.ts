import { useApiClient } from "@workspace/api-client/context"
import type {
  ListResponse,
  ProviderFallback,
} from "@workspace/api-client/types"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const failoverKeys = {
  all: ["providerFallbacks"] as const,
  list: () => [...failoverKeys.all, "list"] as const,
}

export function useProviderFallbacks() {
  const api = useApiClient()
  return useQuery({
    queryKey: failoverKeys.list(),
    queryFn: () =>
      api.get<ListResponse<ProviderFallback>>("/api/provider-fallbacks"),
  })
}

export function useCreateProviderFallback() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      primaryConnectionId: string
      fallbackConnectionId: string
    }) => api.post<ProviderFallback>("/api/provider-fallbacks", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: failoverKeys.all }),
  })
}

export function useDeleteProviderFallback() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/provider-fallbacks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: failoverKeys.all }),
  })
}
