import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type {
  ApiClient,
  InferRequestType,
  InferResponseType,
} from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export type NotificationWithDeliveries = InferResponseType<
  ApiClient["api"]["notifications"][":id"]["$get"],
  200
>

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: ListParams) => [...notificationKeys.lists(), params] as const,
  detail: (id: string) => [...notificationKeys.all, "detail", id] as const,
}

export function useSendNotification() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      payload: InferRequestType<
        ApiClient["api"]["notifications"]["$post"]
      >["json"]
    ) => unwrap(client.api.notifications.$post({ json: payload })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: notificationKeys.lists() }),
  })
}

export function useNotifications(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.notifications.$get({
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

export function useNotification(id: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () =>
      unwrap(client.api.notifications[":id"].$get({ param: { id } })),
    enabled: Boolean(id),
  })
}
