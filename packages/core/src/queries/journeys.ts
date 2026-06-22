import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export type CreateJourneyInput = InferRequestType<
  ApiClient["api"]["journeys"]["$post"]
>["json"]

export const journeyKeys = {
  all: ["journeys"] as const,
  lists: () => [...journeyKeys.all, "list"] as const,
  list: (params: ListParams) => [...journeyKeys.lists(), params] as const,
  detail: (id: string) => [...journeyKeys.all, id] as const,
  runs: (id: string) => [...journeyKeys.all, id, "runs"] as const,
}

export function useJourneys(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.journeys.$get({
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

export function useJourney(id: string) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.detail(id),
    queryFn: () => unwrap(client.api.journeys[":id"].$get({ param: { id } })),
    initialPageParam: undefined as undefined,
    getNextPageParam: () => undefined,
    enabled: !!id,
  })
}

export function useJourneyRuns(journeyId: string, params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: journeyKeys.runs(journeyId),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.journeys[":id"].runs.$get({
          param: { id: journeyId },
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!journeyId,
  })
}

export function useCreateJourney() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["journeys"]["$post"]>["json"]
    ) => unwrap(client.api.journeys.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.lists() }),
  })
}

export function useUpdateJourney() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<
      ApiClient["api"]["journeys"][":id"]["$patch"]
    >["json"]) =>
      unwrap(
        client.api.journeys[":id"].$patch({
          param: { id },
          json: body,
        })
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: journeyKeys.lists() })
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) })
    },
  })
}

export function useDeleteJourney() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.journeys[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.lists() }),
  })
}

export function useActivateJourney() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.journeys[":id"].activate.$post({ param: { id } })),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: journeyKeys.lists() })
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) })
    },
  })
}

export function useEnrollRecipient() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      journeyId,
      ...body
    }: { journeyId: string } & InferRequestType<
      ApiClient["api"]["journeys"][":id"]["enroll"]["$post"]
    >["json"]) =>
      unwrap(
        client.api.journeys[":id"].enroll.$post({
          param: { id: journeyId },
          json: body,
        })
      ),
    onSuccess: (_data, { journeyId }) => {
      qc.invalidateQueries({ queryKey: journeyKeys.runs(journeyId) })
    },
  })
}

export function useTriggerEvent() {
  const client = useApiClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["events"]["$post"]>["json"]
    ) => unwrap(client.api.events.$post({ json: body })),
  })
}
