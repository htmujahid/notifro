import { GitBranchIcon, Trash2Icon } from "lucide-react"

import type { RoutingRule } from "@renderical/api-client/types"
import { type ColumnDef } from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { Badge } from "@renderical/ui/components/badge"
import { Button } from "@renderical/ui/components/button"
import { Switch } from "@renderical/ui/components/switch"

function matchSummary(match: string): string {
  const parsed = (() => {
    try {
      return JSON.parse(match)
    } catch {
      return {}
    }
  })() as Record<string, unknown>
  return Object.keys(parsed).length === 0
    ? "always"
    : Object.entries(parsed)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ")
}

interface RoutingRulesColumnsOptions {
  chainName: (chainId: string | null) => string | null
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function getRoutingRulesColumns({
  chainName,
  onToggle,
  onDelete,
}: RoutingRulesColumnsOptions): ColumnDef<RoutingRule, unknown>[] {
  return [
    {
      accessorKey: "priority",
      meta: { label: "Priority" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-muted-foreground">
          {getValue() as number}
        </span>
      ),
    },
    {
      id: "match",
      accessorFn: (row) => matchSummary(row.match),
      meta: { label: "Match" },
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Match" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "target",
      meta: { label: "Target" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Target" />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const rule = row.original
        return rule.targetChainId ? (
          <span className="flex items-center gap-1">
            <GitBranchIcon className="size-3.5 text-muted-foreground" />
            {chainName(rule.targetChainId) ?? rule.targetChainId}
          </span>
        ) : (
          <Badge variant="secondary">{rule.targetChannel}</Badge>
        )
      },
    },
    {
      id: "enabled",
      meta: { label: "Enabled" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Enabled" />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.enabled === 1}
          onCheckedChange={(v) => onToggle(row.original.id, v)}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onDelete(row.original.id)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]
}
