import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import type { ListParams, ListResponse, ScheduledMessage, RecipientPreferences } from "@workspace/api-client/types"

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
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/schedules/${id}`),
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
    mutationFn: (body: Partial<Pick<RecipientPreferences, "timezone" | "quietHoursStart" | "quietHoursEnd">>) =>
      api.patch<RecipientPreferences>("/api/recipients/preferences", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.preferences() }),
  })
}
