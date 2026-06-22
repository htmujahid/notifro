import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export interface InboxMessage {
  id: string
  userId: string
  notificationId: string | null
  deliveryId: string | null
  title: string
  body: string | null
  icon: string | null
  url: string | null
  seenAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export type InboxFilter = "all" | "unread" | "read"

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
