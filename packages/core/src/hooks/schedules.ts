import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type {
  ListParams,
  RecipientPreferences,
} from "@renderical/api-client/types"

type UpdatePrefsBody = InferRequestType<
  ApiClient["api"]["recipients"]["preferences"]["$patch"]
>["json"]

export const scheduleKeys = {
  all: ["schedules"] as const,
  lists: () => [...scheduleKeys.all, "list"] as const,
  list: (params: ListParams) => [...scheduleKeys.lists(), params] as const,
  preferences: () => [...scheduleKeys.all, "preferences"] as const,
}

export function useSchedules(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: scheduleKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.schedules.$get({
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

export function useCancelSchedule() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.schedules[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.lists() }),
  })
}

export function useRecipientPreferences() {
  const client = useApiClient()
  return useQuery({
    queryKey: scheduleKeys.preferences(),
    queryFn: () => unwrap(client.api.recipients.preferences.$get()),
  })
}

export function useUpdateRecipientPreferences() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Partial<
        Pick<
          RecipientPreferences,
          "timezone" | "quietHoursStart" | "quietHoursEnd"
        >
      >
    ) =>
      unwrap(
        client.api.recipients.preferences.$patch({
          json: body as UpdatePrefsBody,
        })
      ),
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
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: recurringKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.recurring.$get({
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

export function useCreateRecurringSend() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      payload: Record<string, unknown>
      channels: string[]
      cron: string
      timezone?: string
    }) => unwrap(client.api.recurring.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function usePatchRecurringSend() {
  const client = useApiClient()
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
    }) =>
      unwrap(client.api.recurring[":id"].$patch({ param: { id }, json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useDeleteRecurringSend() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.recurring[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useRecurringSendRuns(id: string) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: recurringKeys.runs(id),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.recurring[":id"].runs.$get({
          param: { id },
          query: toQuery({
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
