import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const topicKeys = {
  all: ["topics"] as const,
  lists: () => [...topicKeys.all, "list"] as const,
  list: (params: ListParams) => [...topicKeys.lists(), params] as const,
  detail: (id: string) => [...topicKeys.all, "detail", id] as const,
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

export function useTopicDetail(id: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: topicKeys.detail(id),
    queryFn: () => unwrap(client.api.topics[":id"].$get({ param: { id } })),
    enabled: !!id,
  })
}

export function useCreateTopic() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["topics"]["$post"]>["json"]) =>
      unwrap(client.api.topics.$post({ json: body })),
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
    }: { id: string } & InferRequestType<ApiClient["api"]["topics"][":id"]["$patch"]>["json"]) =>
      unwrap(
        client.api.topics[":id"].$patch({
          param: { id },
          json: body,
        })
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: topicKeys.lists() })
      qc.invalidateQueries({ queryKey: topicKeys.detail(id) })
    },
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
