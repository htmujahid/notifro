import { useApiClient } from "@renderical/api-client/context"
import type {
  Journey,
  JourneyRun,
  ListParams,
  ListResponse,
} from "@renderical/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

export const journeyKeys = {
  all: ["journeys"] as const,
  lists: () => [...journeyKeys.all, "list"] as const,
  list: (params: ListParams) => [...journeyKeys.lists(), params] as const,
  detail: (id: string) => [...journeyKeys.all, id] as const,
  runs: (id: string) => [...journeyKeys.all, id, "runs"] as const,
}

export function useJourneys(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Journey>>("/api/journeys", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useJourney(id: string) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.detail(id),
    queryFn: () => api.get<Journey>(`/api/journeys/${id}`),
    initialPageParam: undefined as undefined,
    getNextPageParam: () => undefined,
    enabled: !!id,
  })
}

export function useJourneyRuns(journeyId: string, params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.runs(journeyId),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<JourneyRun>>(`/api/journeys/${journeyId}/runs`, {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!journeyId,
  })
}

export function useCreateJourney() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      trigger?: Record<string, unknown>
      steps: Record<string, unknown>
    }) => api.post<Journey>("/api/journeys", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.lists() }),
  })
}

export function useUpdateJourney() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      trigger?: Record<string, unknown> | null
      steps?: Record<string, unknown>
      status?: "paused"
    }) => api.patch<Journey>(`/api/journeys/${id}`, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: journeyKeys.lists() })
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) })
    },
  })
}

export function useDeleteJourney() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/journeys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.lists() }),
  })
}

export function useActivateJourney() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Journey>(`/api/journeys/${id}/activate`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: journeyKeys.lists() })
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) })
    },
  })
}

export function useEnrollRecipient() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      journeyId,
      recipientId,
    }: {
      journeyId: string
      recipientId: string
    }) =>
      api.post<JourneyRun>(`/api/journeys/${journeyId}/enroll`, {
        recipientId,
      }),
    onSuccess: (_data, { journeyId }) => {
      qc.invalidateQueries({ queryKey: journeyKeys.runs(journeyId) })
    },
  })
}

export function useTriggerEvent() {
  const api = useApiClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      recipientId?: string
      payload?: Record<string, unknown>
    }) =>
      api.post<{ eventId: string; journeysTriggered: number }>(
        "/api/events",
        body
      ),
  })
}
