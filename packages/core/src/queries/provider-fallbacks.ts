import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@notifro/api-client/client"
import { unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"

export const providerFallbackKeys = {
  all: ["providerFallbacks"] as const,
  list: () => [...providerFallbackKeys.all, "list"] as const,
}

export function useProviderFallbacks() {
  const client = useApiClient()
  return useQuery({
    queryKey: providerFallbackKeys.list(),
    queryFn: () => unwrap(client.api["provider-fallbacks"].$get()),
  })
}

export function useCreateProviderFallback() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<
        ApiClient["api"]["provider-fallbacks"]["$post"]
      >["json"]
    ) => unwrap(client.api["provider-fallbacks"].$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: providerFallbackKeys.all }),
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: providerFallbackKeys.all }),
  })
}
