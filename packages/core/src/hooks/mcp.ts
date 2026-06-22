import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const mcpKeys = {
  all: ["mcp"] as const,
  gates: () => [...mcpKeys.all, "gates"] as const,
  pending: () => [...mcpKeys.all, "pending"] as const,
}

export function useMcpGates() {
  const client = useApiClient()
  return useQuery({
    queryKey: mcpKeys.gates(),
    queryFn: () => unwrap(client.api.mcp.gates.$get()),
  })
}

export function useUpsertMcpGate() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { tool: string; requiresApproval: boolean }) =>
      unwrap(client.api.mcp.gates.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.gates() }),
  })
}

export function useDeleteMcpGate() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.mcp.gates[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.gates() }),
  })
}

export function useMcpPending() {
  const client = useApiClient()
  return useQuery({
    queryKey: mcpKeys.pending(),
    queryFn: () => unwrap(client.api.mcp.pending.$get()),
    refetchInterval: 15_000,
  })
}

export function useApproveMcpAction() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.mcp.pending[":id"].approve.$post({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.pending() }),
  })
}

export function useRejectMcpAction() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.mcp.pending[":id"].reject.$post({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpKeys.pending() }),
  })
}
