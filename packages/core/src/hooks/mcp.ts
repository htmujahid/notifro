import { useApiClient } from "@workspace/api-client/context"
import type {
  ListResponse,
  McpApprovalGate,
  McpPendingAction,
} from "@workspace/api-client/types"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const mcpKeys = {
  all: ["mcp"] as const,
  gates: () => [...mcpKeys.all, "gates"] as const,
  pending: () => [...mcpKeys.all, "pending"] as const,
}

export function useMcpGates() {
  const api = useApiClient()
  return useQuery({
    queryKey: mcpKeys.gates(),
    queryFn: () => api.get<ListResponse<McpApprovalGate>>("/api/mcp/gates"),
  })
}

export function useUpsertMcpGate() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { tool: string; requiresApproval: boolean }) =>
      api.post<McpApprovalGate>("/api/mcp/gates", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.gates() }),
  })
}

export function useDeleteMcpGate() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mcp/gates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.gates() }),
  })
}

export function useMcpPending() {
  const api = useApiClient()
  return useQuery({
    queryKey: mcpKeys.pending(),
    queryFn: () => api.get<ListResponse<McpPendingAction>>("/api/mcp/pending"),
    refetchInterval: 15_000,
  })
}

export function useApproveMcpAction() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ approved: boolean; result: unknown }>(
        `/api/mcp/pending/${id}/approve`,
        {}
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.pending() }),
  })
}

export function useRejectMcpAction() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ rejected: boolean }>(`/api/mcp/pending/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.pending() }),
  })
}
