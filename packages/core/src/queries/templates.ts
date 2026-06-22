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

export const templateKeys = {
  all: ["templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (params: ListParams) => [...templateKeys.lists(), params] as const,
  detail: (id: string) => [...templateKeys.all, "detail", id] as const,
  versions: (id: string) => [...templateKeys.all, "versions", id] as const,
}

export const snippetKeys = {
  all: ["snippets"] as const,
  lists: () => [...snippetKeys.all, "list"] as const,
  list: (params: ListParams) => [...snippetKeys.lists(), params] as const,
}

export const brandKitKeys = {
  all: ["brand-kit"] as const,
}

export function useTemplates(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: templateKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.templates.$get({
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

export function useTemplate(id: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => unwrap(client.api.templates[":id"].$get({ param: { id } })),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["templates"]["$post"]>["json"]
    ) => unwrap(client.api.templates.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  })
}

export function useUpdateTemplate() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<
      ApiClient["api"]["templates"][":id"]["$patch"]
    >["json"]) =>
      unwrap(
        client.api.templates[":id"].$patch({
          param: { id },
          json: body,
        })
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: templateKeys.lists() })
      qc.invalidateQueries({ queryKey: templateKeys.detail(id) })
      qc.invalidateQueries({ queryKey: templateKeys.versions(id) })
    },
  })
}

export function useDeleteTemplate() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.templates[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  })
}

export function useRenderPreview() {
  const client = useApiClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
      locale,
    }: { id: string } & InferRequestType<
      ApiClient["api"]["templates"][":id"]["render"]["$post"]
    >["json"]) =>
      unwrap(
        client.api.templates[":id"].render.$post({
          param: { id },
          json: { data: data ?? {}, locale },
        })
      ),
  })
}

export function useTemplateVersions(
  templateId: string,
  params: ListParams = {}
) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: templateKeys.versions(templateId),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.templates[":id"].versions.$get({
          param: { id: templateId },
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!templateId,
  })
}

export function useRestoreVersion() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      templateId,
      version,
    }: {
      templateId: string
      version: number
    }) =>
      unwrap(
        client.api.templates[":id"].versions[":version"].restore.$post({
          param: { id: templateId, version: String(version) },
        })
      ),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      qc.invalidateQueries({ queryKey: templateKeys.versions(templateId) })
      qc.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

export function useSnippets(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: snippetKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.snippets.$get({
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

export function useCreateSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["snippets"]["$post"]>["json"]
    ) => unwrap(client.api.snippets.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useUpdateSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<
      ApiClient["api"]["snippets"][":id"]["$patch"]
    >["json"]) =>
      unwrap(client.api.snippets[":id"].$patch({ param: { id }, json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useDeleteSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.snippets[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useBrandKit() {
  const client = useApiClient()
  return useQuery({
    queryKey: brandKitKeys.all,
    queryFn: () => unwrap(client.api["brand-kit"].$get()),
    retry: (failureCount, error) => {
      if ((error as { status?: number }).status === 404) return false
      return failureCount < 3
    },
  })
}

export function useUpdateBrandKit() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["brand-kit"]["$put"]>["json"]
    ) => unwrap(client.api["brand-kit"].$put({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKitKeys.all }),
  })
}
