import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import type { ListParams, ListResponse, FallbackChain, RoutingRule } from "@workspace/api-client/types"

export const routingRuleKeys = {
  all: ["routingRules"] as const,
  lists: () => [...routingRuleKeys.all, "list"] as const,
  list: (params: ListParams) => [...routingRuleKeys.lists(), params] as const,
}

export const fallbackChainKeys = {
  all: ["fallbackChains"] as const,
  lists: () => [...fallbackChainKeys.all, "list"] as const,
  list: (params: ListParams) => [...fallbackChainKeys.lists(), params] as const,
}

export function useRoutingRules(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: routingRuleKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<RoutingRule>>("/api/routing/rules", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateRoutingRule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      priority: number
      enabled?: boolean
      match: Record<string, unknown>
      targetChainId?: string
      targetChannel?: string
    }) => api.post<RoutingRule>("/api/routing/rules", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useUpdateRoutingRule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string
      priority?: number
      enabled?: boolean
      match?: Record<string, unknown>
      targetChainId?: string | null
      targetChannel?: string | null
    }) => api.patch<RoutingRule>(`/api/routing/rules/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useDeleteRoutingRule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/routing/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useFallbackChains(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: fallbackChainKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<FallbackChain>>("/api/routing/chains", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateFallbackChain() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      steps: Array<{
        channel: string
        connectionId?: string
        waitForDeliveryMs: number
        successOn: ('delivered' | 'opened' | 'clicked')[]
      }>
    }) => api.post<FallbackChain>("/api/routing/chains", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useUpdateFallbackChain() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string
      name?: string
      steps?: Array<{
        channel: string
        connectionId?: string
        waitForDeliveryMs: number
        successOn: ('delivered' | 'opened' | 'clicked')[]
      }>
    }) => api.patch<FallbackChain>(`/api/routing/chains/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useDeleteFallbackChain() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/routing/chains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useResolveRoute() {
  const api = useApiClient()
  return useMutation({
    mutationFn: (body: { priority?: string; messageType?: string }) =>
      api.post<{ result: unknown }>("/api/routing/resolve", body),
  })
}
