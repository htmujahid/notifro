import { useApiClient } from "@workspace/api-client/context"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"

import {
  useApproveMcpAction,
  useDeleteMcpGate,
  useMcpGates,
  useMcpPending,
  useRejectMcpAction,
  useUpsertMcpGate,
} from "../../hooks/mcp"

const MCP_TOOLS = [
  "send_notification",
  "schedule_notification",
  "create_template",
]

export function McpSection() {
  const api = useApiClient()
  const { data: gatesData, isLoading: gatesLoading } = useMcpGates()
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useMcpPending()
  const upsertGate = useUpsertMcpGate()
  const deleteGate = useDeleteMcpGate()
  const approveAction = useApproveMcpAction()
  const rejectAction = useRejectMcpAction()

  const gates = gatesData?.data ?? []
  const pending = pendingData?.data ?? []

  const mcpUrl = `${api.baseURL}/mcp`

  function getGateValue(tool: string): boolean {
    const gate = gates.find((g) => g.tool === tool)
    return gate ? gate.requiresApproval === 1 : true
  }

  function getGateId(tool: string): string | undefined {
    return gates.find((g) => g.tool === tool)?.id
  }

  function toggleGate(tool: string, current: boolean) {
    upsertGate.mutate({ tool, requiresApproval: !current })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">MCP server</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Connect AI agents via the Model Context Protocol.
          </p>
        </div>
        <BotIcon className="size-4 text-muted-foreground" />
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Remote endpoint
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono break-all">
                {mcpUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="size-7 shrink-0"
                onClick={() => navigator.clipboard.writeText(mcpUrl)}
              >
                <CopyIcon className="size-3.5" />
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Authenticate with an API key:{" "}
              <code className="text-xs">Authorization: Bearer rk_live_…</code>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Local stdio binary
            </p>
            <code className="block rounded bg-muted px-2 py-1 text-xs font-mono">
              RENDERICAL_API_KEY=rk_… npx @workspace/mcp
            </code>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-xs font-medium mb-2">Approval gates</h3>
        <p className="text-xs text-muted-foreground mb-3">
          When enabled, outbound actions require human approval before
          executing.
        </p>
        {gatesLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {MCP_TOOLS.map((tool) => {
              const requires = getGateValue(tool)
              const gateId = getGateId(tool)
              return (
                <div key={tool} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 font-mono text-xs">{tool}</span>
                  <Badge
                    variant={requires ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {requires ? "requires approval" : "auto-send"}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      disabled={upsertGate.isPending}
                      onClick={() => toggleGate(tool, requires)}
                    >
                      {requires ? "Disable" : "Enable"}
                    </Button>
                    {gateId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-destructive hover:text-destructive"
                        onClick={() => deleteGate.mutate(gateId)}
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium">Pending approvals</h3>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 gap-1"
            onClick={() => refetchPending()}
          >
            <RefreshCwIcon className="size-3" />
            Refresh
          </Button>
        </div>
        {pendingLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pending approvals.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {pending.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs">{action.tool}</p>
                  <p className="text-xs text-muted-foreground">
                    expires {new Date(action.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7 text-green-600 hover:text-green-600 border-green-200"
                    disabled={approveAction.isPending}
                    onClick={() => approveAction.mutate(action.id)}
                  >
                    <CheckIcon className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={rejectAction.isPending}
                    onClick={() => rejectAction.mutate(action.id)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
