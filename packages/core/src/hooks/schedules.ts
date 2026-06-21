import { useApiClient } from "@workspace/api-client/context"
import type {
  ListParams,
  ListResponse,
  RecipientPreferences,
  RecurringSend,
  ScheduledMessage,
} from "@workspace/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

export const scheduleKeys = {
  all: ["schedules"] as const,
  lists: () => [...scheduleKeys.all, "list"] as const,
  list: (params: ListParams) => [...scheduleKeys.lists(), params] as const,
  preferences: () => [...scheduleKeys.all, "preferences"] as const,
}

export function useSchedules(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: scheduleKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<ScheduledMessage>>("/api/schedules", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCancelSchedule() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ ok: boolean }>(`/api/schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.lists() }),
  })
}

export function useRecipientPreferences() {
  const api = useApiClient()
  return useQuery({
    queryKey: scheduleKeys.preferences(),
    queryFn: () => api.get<RecipientPreferences>("/api/recipients/preferences"),
  })
}

export function useUpdateRecipientPreferences() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Partial<
        Pick<
          RecipientPreferences,
          "timezone" | "quietHoursStart" | "quietHoursEnd"
        >
      >
    ) => api.patch<RecipientPreferences>("/api/recipients/preferences", body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: scheduleKeys.preferences() }),
  })
}

export const recurringKeys = {
  all: ["recurring"] as const,
  lists: () => [...recurringKeys.all, "list"] as const,
  list: (params: ListParams) => [...recurringKeys.lists(), params] as const,
  runs: (id: string) => [...recurringKeys.all, "runs", id] as const,
}

export function useRecurringSends(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: recurringKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<RecurringSend>>("/api/recurring", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateRecurringSend() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      payload: Record<string, unknown>
      channels: string[]
      cron: string
      timezone?: string
    }) => api.post<RecurringSend>("/api/recurring", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function usePatchRecurringSend() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      enabled?: number
      cron?: string
      timezone?: string
    }) => api.patch<RecurringSend>(`/api/recurring/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useDeleteRecurringSend() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ ok: boolean }>(`/api/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useRecurringSendRuns(id: string) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: recurringKeys.runs(id),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<ScheduledMessage>>(`/api/recurring/${id}/runs`, {
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
