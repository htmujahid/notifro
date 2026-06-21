import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import type { FrequencyCap, DigestRule, ListParams, ListResponse } from "@workspace/api-client/types"

export const frequencyCapKeys = {
  all: ["frequency-caps"] as const,
  lists: () => [...frequencyCapKeys.all, "list"] as const,
  list: (params: ListParams) => [...frequencyCapKeys.lists(), params] as const,
}

export const digestRuleKeys = {
  all: ["digest-rules"] as const,
  lists: () => [...digestRuleKeys.all, "list"] as const,
  list: (params: ListParams) => [...digestRuleKeys.lists(), params] as const,
}

export function useFrequencyCaps(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: frequencyCapKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<FrequencyCap>>("/api/frequency-caps", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateFrequencyCap() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      topicId?: string
      maxCount: number
      windowSeconds: number
      overflowPolicy?: "drop" | "defer" | "digest"
      digestKey?: string
      digestSchedule?: string
      digestTemplateId?: string
    }) => api.post<FrequencyCap>("/api/frequency-caps", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: frequencyCapKeys.lists() }),
  })
}

export function useUpdateFrequencyCap() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      channel?: string
      maxCount?: number
      windowSeconds?: number
      overflowPolicy?: "drop" | "defer" | "digest"
    }) => api.patch<FrequencyCap>(`/api/frequency-caps/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: frequencyCapKeys.all }),
  })
}

export function useDeleteFrequencyCap() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/frequency-caps/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: frequencyCapKeys.lists() }),
  })
}

export function useDigestRules(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: digestRuleKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<DigestRule>>("/api/digest-rules", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateDigestRule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      channel: string
      topicId?: string
      digestKey: string
      schedule: "hourly" | "daily" | "weekly"
      templateId?: string
    }) => api.post<DigestRule>("/api/digest-rules", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: digestRuleKeys.lists() }),
  })
}

export function useDeleteDigestRule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/digest-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: digestRuleKeys.lists() }),
  })
}
