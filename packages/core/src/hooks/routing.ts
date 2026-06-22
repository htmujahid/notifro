import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

type ResolveRouteBody = InferRequestType<
  ApiClient["api"]["routing"]["resolve"]["$post"]
>["json"]

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
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: routingRuleKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.routing.rules.$get({
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

export function useCreateRoutingRule() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      priority: number
      enabled?: boolean
      match: Record<string, unknown>
      targetChainId?: string
      targetChannel?: string
    }) => unwrap(client.api.routing.rules.$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useUpdateRoutingRule() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      priority?: number
      enabled?: boolean
      match?: Record<string, unknown>
      targetChainId?: string | null
      targetChannel?: string | null
    }) =>
      unwrap(
        client.api.routing.rules[":id"].$patch({ param: { id }, json: body })
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useDeleteRoutingRule() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.routing.rules[":id"].$delete({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: routingRuleKeys.lists() }),
  })
}

export function useFallbackChains(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: fallbackChainKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.routing.chains.$get({
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

export function useCreateFallbackChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      steps: Array<{
        channel: string
        connectionId?: string
        waitForDeliveryMs: number
        successOn: ("delivered" | "opened" | "clicked")[]
      }>
    }) => unwrap(client.api.routing.chains.$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useUpdateFallbackChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      steps?: Array<{
        channel: string
        connectionId?: string
        waitForDeliveryMs: number
        successOn: ("delivered" | "opened" | "clicked")[]
      }>
    }) =>
      unwrap(
        client.api.routing.chains[":id"].$patch({ param: { id }, json: body })
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useDeleteFallbackChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.routing.chains[":id"].$delete({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: fallbackChainKeys.lists() }),
  })
}

export function useResolveRoute() {
  const client = useApiClient()
  return useMutation({
    mutationFn: (body: { priority?: string; messageType?: string }) =>
      unwrap(
        client.api.routing.resolve.$post({ json: body as ResolveRouteBody })
      ),
  })
}
