import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useApiClient } from "@renderical/api-client/context"
import type {
  ChannelPriority,
  ListParams,
  ListResponse,
  Preference,
  PreferenceCenter,
  Topic,
} from "@renderical/api-client/types"

export const topicKeys = {
  all: ["topics"] as const,
  lists: () => [...topicKeys.all, "list"] as const,
  list: (params: ListParams) => [...topicKeys.lists(), params] as const,
  detail: (id: string) => [...topicKeys.all, "detail", id] as const,
}

export const preferenceKeys = {
  center: (token: string) => ["preference-center", token] as const,
  recipient: (id: string) => ["recipient-preferences", id] as const,
  channelPriority: (id: string) => ["channel-priority", id] as const,
}

export function useTopics(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: topicKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Topic>>("/api/topics", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateTopic() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      key: string
      name: string
      description?: string
      defaultOptIn?: boolean
      transactional?: boolean
    }) => api.post<Topic>("/api/topics", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.lists() }),
  })
}

export function useUpdateTopic() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      description?: string | null
      defaultOptIn?: boolean
      transactional?: boolean
    }) => api.patch<Topic>(`/api/topics/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.all }),
  })
}

export function useDeleteTopic() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/topics/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.lists() }),
  })
}

export function useGeneratePreferenceToken() {
  const api = useApiClient()
  return useMutation({
    mutationFn: (recipientId: string) =>
      api.post<{ token: string; expiresAt: string }>("/api/preferences/token", {
        recipientId,
      }),
  })
}

export function usePreferenceCenter(token: string | undefined) {
  const api = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.center(token ?? ""),
    queryFn: () =>
      api.get<PreferenceCenter>(`/api/preferences/center`, { token }),
    enabled: !!token,
  })
}

export function useUpdatePreferences(token: string | undefined) {
  const qc = useQueryClient()
  const api = useApiClient()
  return useMutation({
    mutationFn: (
      preferences: Array<{
        topicId?: string | null
        channel: string
        optedIn: boolean
      }>
    ) =>
      api.post<{ updated: number }>(
        `/api/preferences/center?token=${token ?? ""}`,
        { preferences }
      ),
    onSuccess: () => {
      if (token)
        qc.invalidateQueries({ queryKey: preferenceKeys.center(token) })
    },
  })
}

export function useUnsubscribeInfo(token: string | undefined) {
  const api = useApiClient()
  return useQuery({
    queryKey: ["unsubscribe-info", token ?? ""],
    queryFn: () =>
      api.get<{ recipientId: string; email: string | null; ok: boolean }>(
        `/api/unsubscribe`,
        { token }
      ),
    enabled: !!token,
  })
}

export function useUnsubscribe(token: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/unsubscribe?token=${token ?? ""}`, {
        method: "POST",
      })
      return res.json() as Promise<{ ok: boolean }>
    },
  })
}

export function useRecipientPreferences(recipientId: string | undefined) {
  const api = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.recipient(recipientId ?? ""),
    queryFn: () =>
      api.get<{ data: Preference[] }>(
        `/api/recipients/${recipientId}/preferences`
      ),
    enabled: !!recipientId,
  })
}

export function useSetRecipientPreferences(recipientId: string) {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      preferences: Array<{
        topicId?: string | null
        channel: string
        optedIn: boolean
      }>
    ) =>
      api.put<{ updated: number }>(
        `/api/recipients/${recipientId}/preferences`,
        { preferences }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: preferenceKeys.recipient(recipientId) }),
  })
}

export function useChannelPriority(recipientId: string | undefined) {
  const api = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.channelPriority(recipientId ?? ""),
    queryFn: () =>
      api.get<ChannelPriority>(
        `/api/recipients/${recipientId}/channel-priority`
      ),
    enabled: !!recipientId,
  })
}

export function useSetChannelPriority(recipientId: string) {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      api.put<ChannelPriority>(
        `/api/recipients/${recipientId}/channel-priority`,
        { order }
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: preferenceKeys.channelPriority(recipientId),
      }),
  })
}
