import { useApiClient } from "@renderical/api-client/context"
import type {
  BrandKit,
  ListParams,
  ListResponse,
  Snippet,
  Template,
  TemplateVersion,
} from "@renderical/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

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
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: templateKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Template>>("/api/templates", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useTemplate(id: string) {
  const api = useApiClient()
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => api.get<Template>(`/api/templates/${id}`),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      slug: string
      description?: string
      defaultLocale?: string
      content: Record<string, unknown>
      variables?: Array<{ key: string; type?: string; required?: boolean }>
      localeStrings?: Record<string, Record<string, string>>
    }) => api.post<Template>("/api/templates", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  })
}

export function useUpdateTemplate() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      slug?: string
      description?: string
      defaultLocale?: string
      content?: Record<string, unknown>
      variables?: Array<{ key: string; type?: string; required?: boolean }>
      localeStrings?: Record<string, Record<string, string>>
    }) => api.patch<Template>(`/api/templates/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: templateKeys.lists() })
      qc.invalidateQueries({ queryKey: templateKeys.detail(id) })
      qc.invalidateQueries({ queryKey: templateKeys.versions(id) })
    },
  })
}

export function useDeleteTemplate() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  })
}

export function useRenderPreview() {
  const api = useApiClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
      locale,
    }: {
      id: string
      data?: Record<string, unknown>
      locale?: string
    }) =>
      api.post<{
        content: Record<string, unknown>
        templateId: string
        locale: string
      }>(`/api/templates/${id}/render`, { data: data ?? {}, locale }),
  })
}

export function useTemplateVersions(
  templateId: string,
  params: ListParams = {}
) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: templateKeys.versions(templateId),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<TemplateVersion>>(
        `/api/templates/${templateId}/versions`,
        {
          ...params,
          ...(pageParam ? { cursor: pageParam as string } : {}),
        }
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!templateId,
  })
}

export function useRestoreVersion() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      templateId,
      version,
    }: {
      templateId: string
      version: number
    }) =>
      api.post<{ id: string; version: number; message: string }>(
        `/api/templates/${templateId}/versions/${version}/restore`,
        {}
      ),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      qc.invalidateQueries({ queryKey: templateKeys.versions(templateId) })
      qc.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

export function useSnippets(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: snippetKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Snippet>>("/api/snippets", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateSnippet() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; content: Record<string, unknown> }) =>
      api.post<Snippet>("/api/snippets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useUpdateSnippet() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      content?: Record<string, unknown>
    }) => api.patch<Snippet>(`/api/snippets/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useDeleteSnippet() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/snippets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useBrandKit() {
  const api = useApiClient()
  return useQuery({
    queryKey: brandKitKeys.all,
    queryFn: () => api.get<BrandKit>("/api/brand-kit"),
    retry: (failureCount, error) => {
      if ((error as { status?: number }).status === 404) return false
      return failureCount < 3
    },
  })
}

export function useUpdateBrandKit() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      logoUrl?: string | null
      colors?: Record<string, string> | null
      fontStack?: string | null
    }) => api.put<BrandKit>("/api/brand-kit", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKitKeys.all }),
  })
}
