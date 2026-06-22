import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@notifro/api-client/client"
import { toQuery, unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"
import type { ListParams } from "@notifro/api-client/types"

export const rateLimitKeys = {
  all: ["rateLimits"] as const,
  lists: () => [...rateLimitKeys.all, "list"] as const,
  list: (params: ListParams) => [...rateLimitKeys.lists(), params] as const,
}

export function useRateLimits(params: ListParams = {}) {
  const client = useApiClient()
  return useQuery({
    queryKey: rateLimitKeys.list(params),
    queryFn: () =>
      unwrap(client.api["rate-limits"].$get({ query: toQuery(params) })),
    placeholderData: keepPreviousData,
  })
}

export function useUpsertRateLimit() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["rate-limits"]["$post"]>["json"]
    ) => unwrap(client.api["rate-limits"].$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateLimitKeys.lists() }),
  })
}

export function useDeleteRateLimit() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api["rate-limits"][":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateLimitKeys.lists() }),
  })
}
