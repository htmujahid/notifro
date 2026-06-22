import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"
import type { ListParams } from "@notifro/api-client/types"

export const deliveryKeys = {
  all: ["deliveries"] as const,
  lists: () => [...deliveryKeys.all, "list"] as const,
  list: (params: ListParams) => [...deliveryKeys.lists(), params] as const,
  dead: (params: ListParams) => [...deliveryKeys.all, "dead", params] as const,
  events: (id: string) => [...deliveryKeys.all, "events", id] as const,
}

export function useDeliveries(params: ListParams = {}) {
  const client = useApiClient()
  return useQuery({
    queryKey: deliveryKeys.list(params),
    queryFn: () =>
      unwrap(client.api.deliveries.$get({ query: toQuery(params) })),
    placeholderData: keepPreviousData,
  })
}

export function useDeadLetters(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: deliveryKeys.dead(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.deliveries.dead.$get({
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

export function useDeliveryEvents(id: string | undefined) {
  const client = useApiClient()
  return useQuery({
    queryKey: deliveryKeys.events(id ?? ""),
    queryFn: () =>
      unwrap(client.api.deliveries[":id"].events.$get({ param: { id: id! } })),
    enabled: !!id,
  })
}

export function useRetryDelivery() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.deliveries[":id"].retry.$post({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: deliveryKeys.all }),
  })
}
