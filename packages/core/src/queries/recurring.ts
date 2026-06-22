import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const recurringKeys = {
  all: ["recurring"] as const,
  lists: () => [...recurringKeys.all, "list"] as const,
  list: (params: ListParams) => [...recurringKeys.lists(), params] as const,
  runs: (id: string) => [...recurringKeys.all, "runs", id] as const,
}

export function useRecurrings(params: ListParams = {}) {
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

export function useCreateRecurring() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["recurring"]["$post"]>["json"]
    ) => unwrap(client.api.recurring.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useUpdateRecurring() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<
      ApiClient["api"]["recurring"][":id"]["$patch"]
    >["json"]) =>
      unwrap(client.api.recurring[":id"].$patch({ param: { id }, json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useDeleteRecurring() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.recurring[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.lists() }),
  })
}

export function useRecurringRuns(id: string, params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: [...recurringKeys.runs(id), params],
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.recurring[":id"].runs.$get({
          param: { id },
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
