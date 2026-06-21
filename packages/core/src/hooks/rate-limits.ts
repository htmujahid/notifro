import { useApiClient } from "@workspace/api-client/context"
import type {
  ListParams,
  ListResponse,
  RateLimitRule,
} from "@workspace/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

export const rateLimitKeys = {
  all: ["rateLimits"] as const,
  lists: () => [...rateLimitKeys.all, "list"] as const,
  list: (params: ListParams) => [...rateLimitKeys.lists(), params] as const,
}

export function useRateLimits(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: rateLimitKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<RateLimitRule>>("/api/rate-limits", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useUpsertRateLimit() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      maxCount: number
      windowSeconds: number
    }) => api.post<RateLimitRule>("/api/rate-limits", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateLimitKeys.lists() }),
  })
}

export function useUpdateRateLimit() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      maxCount?: number
      windowSeconds?: number
    }) => api.patch<RateLimitRule>(`/api/rate-limits/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateLimitKeys.lists() }),
  })
}

export function useDeleteRateLimit() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/rate-limits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: rateLimitKeys.lists() }),
  })
}
