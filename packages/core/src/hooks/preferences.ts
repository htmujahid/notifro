import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

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
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: topicKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.topics.$get({
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

export function useCreateTopic() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      key: string
      name: string
      description?: string
      defaultOptIn?: boolean
      transactional?: boolean
    }) => unwrap(client.api.topics.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.lists() }),
  })
}

export function useUpdateTopic() {
  const client = useApiClient()
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
    }) =>
      unwrap(client.api.topics[":id"].$patch({ param: { id }, json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.all }),
  })
}

export function useDeleteTopic() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.topics[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicKeys.lists() }),
  })
}

export function useGeneratePreferenceToken() {
  const client = useApiClient()
  return useMutation({
    mutationFn: (recipientId: string) =>
      unwrap(client.api.preferences.token.$post({ json: { recipientId } })),
  })
}

export function usePreferenceCenter(token: string | undefined) {
  const client = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.center(token ?? ""),
    queryFn: () =>
      unwrap(
        client.api.preferences.center.$get({ query: { token: token ?? "" } })
      ),
    enabled: !!token,
  })
}

export function useUpdatePreferences(token: string | undefined) {
  const qc = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: (
      preferences: Array<{
        topicId?: string | null
        channel: string
        optedIn: boolean
      }>
    ) =>
      unwrap(
        client.api.preferences.center.$post({
          query: { token: token ?? "" },
          json: { preferences },
        })
      ),
    onSuccess: () => {
      if (token)
        qc.invalidateQueries({ queryKey: preferenceKeys.center(token) })
    },
  })
}

export function useUnsubscribeInfo(token: string | undefined) {
  const client = useApiClient()
  return useQuery({
    queryKey: ["unsubscribe-info", token ?? ""],
    queryFn: () =>
      unwrap(client.api.unsubscribe.$get({ query: { token: token ?? "" } })),
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
  const client = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.recipient(recipientId ?? ""),
    queryFn: () =>
      unwrap(
        client.api.recipients[":id"].preferences.$get({
          param: { id: recipientId ?? "" },
        })
      ),
    enabled: !!recipientId,
  })
}

export function useSetRecipientPreferences(recipientId: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      preferences: Array<{
        topicId?: string | null
        channel: string
        optedIn: boolean
      }>
    ) =>
      unwrap(
        client.api.recipients[":id"].preferences.$put({
          param: { id: recipientId },
          json: { preferences },
        })
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: preferenceKeys.recipient(recipientId) }),
  })
}

export function useChannelPriority(recipientId: string | undefined) {
  const client = useApiClient()
  return useQuery({
    queryKey: preferenceKeys.channelPriority(recipientId ?? ""),
    queryFn: () =>
      unwrap(
        client.api.recipients[":id"]["channel-priority"].$get({
          param: { id: recipientId ?? "" },
        })
      ),
    enabled: !!recipientId,
  })
}

export function useSetChannelPriority(recipientId: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      unwrap(
        client.api.recipients[":id"]["channel-priority"].$put({
          param: { id: recipientId },
          json: { order },
        })
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: preferenceKeys.channelPriority(recipientId),
      }),
  })
}
