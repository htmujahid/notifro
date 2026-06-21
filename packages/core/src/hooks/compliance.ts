import { useApiClient } from "@workspace/api-client/context"
import type {
  ConsentEvent,
  ListParams,
  ListResponse,
  Suppression,
} from "@workspace/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

export const complianceKeys = {
  suppressions: ["suppressions"] as const,
  suppressionList: (params: ListParams) =>
    [...complianceKeys.suppressions, params] as const,
  consentEvents: ["consentEvents"] as const,
  consentEventList: (params: ListParams) =>
    [...complianceKeys.consentEvents, params] as const,
}

export function useSuppressions(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: complianceKeys.suppressionList(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Suppression>>("/api/suppressions", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useAddSuppression() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      address: string
      reason: "hard_bounce" | "complaint" | "unsubscribe" | "manual"
    }) => api.post<Suppression>("/api/suppressions", body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.suppressions }),
  })
}

export function useDeleteSuppression() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/suppressions/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: complianceKeys.suppressions }),
  })
}

export function useConsentEvents(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: complianceKeys.consentEventList(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<ConsentEvent>>("/api/consent-events", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
