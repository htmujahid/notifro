import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const complianceKeys = {
  suppressions: ["suppressions"] as const,
  suppressionList: (params: ListParams) =>
    [...complianceKeys.suppressions, params] as const,
  consentEvents: ["consentEvents"] as const,
  consentEventList: (params: ListParams) =>
    [...complianceKeys.consentEvents, params] as const,
}

export function useSuppressions(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: complianceKeys.suppressionList(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.suppressions.$get({
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useAddSuppression() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      address: string
      reason: "hard_bounce" | "complaint" | "unsubscribe" | "manual"
    }) => unwrap(client.api.suppressions.$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.suppressions }),
  })
}

export function useDeleteSuppression() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.suppressions[":id"].$delete({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.suppressions }),
  })
}

export function useConsentEvents(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: complianceKeys.consentEventList(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api["consent-events"].$get({
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
