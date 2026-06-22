import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type {
  ApiClient,
  InferResponseType,
} from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export type InboxFilter = "all" | "unread" | "read"
export type InboxMessage = InferResponseType<
  ApiClient["api"]["inbox"]["$get"],
  200
>["data"][number]

export const inboxKeys = {
  all: ["inbox"] as const,
  lists: () => [...inboxKeys.all, "list"] as const,
  list: (filter: InboxFilter) => [...inboxKeys.lists(), filter] as const,
  unreadCount: () => [...inboxKeys.all, "unread-count"] as const,
}

export function useInbox(filter: InboxFilter = "all") {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: inboxKeys.list(filter),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.inbox.$get({
          query: toQuery({
            filter,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useUnreadCount() {
  const client = useApiClient()
  return useQuery({
    queryKey: inboxKeys.unreadCount(),
    queryFn: () => unwrap(client.api.inbox["unread-count"].$get()),
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.inbox[":id"].read.$post({ param: { id } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.lists() })
      qc.invalidateQueries({ queryKey: inboxKeys.unreadCount() })
    },
  })
}

export function useMarkAllRead() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(client.api.inbox["read-all"].$post()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.lists() })
      qc.invalidateQueries({ queryKey: inboxKeys.unreadCount() })
    },
  })
}
