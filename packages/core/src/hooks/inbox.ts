import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import type { ListResponse } from "@workspace/api-client/types"

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

export type InboxFilter = 'all' | 'unread' | 'read'

export const inboxKeys = {
  all: ['inbox'] as const,
  lists: () => [...inboxKeys.all, 'list'] as const,
  list: (filter: InboxFilter) => [...inboxKeys.lists(), filter] as const,
  unreadCount: () => [...inboxKeys.all, 'unread-count'] as const,
}

export function useInbox(filter: InboxFilter = 'all') {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: inboxKeys.list(filter),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<InboxMessage>>('/api/inbox', {
        filter,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useUnreadCount() {
  const api = useApiClient()
  return useQuery({
    queryKey: inboxKeys.unreadCount(),
    queryFn: () => api.get<{ count: number }>('/api/inbox/unread-count'),
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<InboxMessage>(`/api/inbox/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.lists() })
      qc.invalidateQueries({ queryKey: inboxKeys.unreadCount() })
    },
  })
}

export function useMarkAllRead() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ updated: number }>('/api/inbox/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.lists() })
      qc.invalidateQueries({ queryKey: inboxKeys.unreadCount() })
    },
  })
}
