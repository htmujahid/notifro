import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useApiClient } from "@renderical/api-client/context"
import type {
  ListParams,
  ListResponse,
  RecipientRecord,
  Segment,
  SegmentPreview,
} from "@renderical/api-client/types"

export const recipientKeys = {
  all: ["recipients"] as const,
  lists: () => [...recipientKeys.all, "list"] as const,
  list: (params: ListParams) => [...recipientKeys.lists(), params] as const,
  detail: (id: string) => [...recipientKeys.all, "detail", id] as const,
}

export const segmentKeys = {
  all: ["segments"] as const,
  lists: () => [...segmentKeys.all, "list"] as const,
  list: (params: ListParams) => [...segmentKeys.lists(), params] as const,
  detail: (id: string) => [...segmentKeys.all, "detail", id] as const,
  preview: (id: string) => [...segmentKeys.all, "preview", id] as const,
}

export function useRecipients(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: recipientKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<RecipientRecord>>("/api/recipients", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateRecipient() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      externalId?: string
      email?: string
      phone?: string
      locale?: string
      timezone?: string
      attributes?: Record<string, unknown>
    }) => api.post<RecipientRecord>("/api/recipients", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}

export function useIdentifyRecipient() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      externalId: string
      email?: string
      phone?: string
      locale?: string
      timezone?: string
      attributes?: Record<string, unknown>
    }) => api.post<RecipientRecord>("/api/recipients/identify", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}

export function useDeleteRecipient() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/recipients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}

export function useSegments(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: segmentKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Segment>>("/api/segments", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useSegmentPreview(id: string) {
  const api = useApiClient()
  return useQuery({
    queryKey: segmentKeys.preview(id),
    queryFn: () => api.get<SegmentPreview>(`/api/segments/${id}/preview`),
    enabled: !!id,
  })
}

export function useCreateSegment() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; filter: Record<string, unknown> }) =>
      api.post<Segment>("/api/segments", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.lists() }),
  })
}

export function useUpdateSegment() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      filter?: Record<string, unknown>
    }) => api.patch<Segment>(`/api/segments/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: segmentKeys.lists() })
      qc.invalidateQueries({ queryKey: segmentKeys.detail(id) })
    },
  })
}

export function useDeleteSegment() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/segments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.lists() }),
  })
}
