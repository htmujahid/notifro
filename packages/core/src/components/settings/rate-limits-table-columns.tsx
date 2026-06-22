import { TrashIcon } from "lucide-react"

import type { RateLimitRule } from "@renderical/api-client/types"
import { type ColumnDef } from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"

interface RateLimitsColumnsOptions {
  onDelete: (id: string) => void
}

export function getRateLimitsColumns({
  onDelete,
}: RateLimitsColumnsOptions): ColumnDef<RateLimitRule, unknown>[] {
  return [
    {
      accessorKey: "channel",
      meta: { label: "Channel" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Channel" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "maxCount",
      meta: { label: "Max sends" },
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Max sends" />
      ),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "windowSeconds",
      meta: { label: "Window" },
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Window" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as number}s</span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(row.original.id)}
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
      ),
    },
  ]
}
