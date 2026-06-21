import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useApiClient } from "@renderical/api-client/context"
import type {
  DeadLetter,
  Delivery,
  DeliveryEvent,
  ListParams,
  ListResponse,
} from "@renderical/api-client/types"

export const deliveryKeys = {
  all: ["deliveries"] as const,
  lists: () => [...deliveryKeys.all, "list"] as const,
  list: (params: ListParams) => [...deliveryKeys.lists(), params] as const,
  dead: (params: ListParams) => [...deliveryKeys.all, "dead", params] as const,
  events: (id: string) => [...deliveryKeys.all, "events", id] as const,
}

export function useDeliveries(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: deliveryKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Delivery>>("/api/deliveries", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useDeadLetters(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: deliveryKeys.dead(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<DeadLetter>>("/api/deliveries/dead", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useDeliveryEvents(id: string | undefined) {
  const api = useApiClient()
  return useQuery({
    queryKey: deliveryKeys.events(id ?? ""),
    queryFn: () =>
      api.get<{ data: DeliveryEvent[] }>(`/api/deliveries/${id}/events`),
    enabled: !!id,
  })
}

export function useRetryDelivery() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ queued: boolean }>(`/api/deliveries/${id}/retry`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: deliveryKeys.all }),
  })
}
