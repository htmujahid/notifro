import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const brandKitKeys = {
  all: ["brand-kit"] as const,
  brandKit: () => [...brandKitKeys.all] as const,
}

export function useBrandKit() {
  const client = useApiClient()
  return useQuery({
    queryKey: brandKitKeys.brandKit(),
    queryFn: () => unwrap(client.api["brand-kit"].$get()),
  })
}

export function useUpdateBrandKit() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["brand-kit"]["$put"]>["json"]) =>
      unwrap(client.api["brand-kit"].$put({ json: body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandKitKeys.all })
    },
  })
}
