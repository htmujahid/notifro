import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import type { ListParams, ListResponse } from "@workspace/api-client/types"

export interface Connection {
  id: string
  userId: string
  type: string
  name: string
  status: string
  config: string
  scopes: string
  health: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionInput {
  type: string
  name: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
  scopes?: string[]
}

export interface UpdateConnectionInput {
  name?: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
  status?: string
  scopes?: string[]
}

export const connectionKeys = {
  all: ["connections"] as const,
  lists: () => [...connectionKeys.all, "list"] as const,
  list: (params: ListParams) => [...connectionKeys.lists(), params] as const,
  detail: (id: string) => [...connectionKeys.all, "detail", id] as const,
}

export function useConnections(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: connectionKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Connection>>("/api/connections", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateConnection() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateConnectionInput) =>
      api.post<Connection>("/api/connections", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.lists() }),
  })
}

export function useUpdateConnection(id: string) {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateConnectionInput) =>
      api.patch<Connection>(`/api/connections/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connectionKeys.lists() })
      qc.invalidateQueries({ queryKey: connectionKeys.detail(id) })
    },
  })
}

export function useDeleteConnection() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ ok: boolean }>(`/api/connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.lists() }),
  })
}

export function useConnectionHealth(id: string) {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean; message?: string; checkedAt: string }>(`/api/connections/${id}/health`),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.detail(id) }),
  })
}
