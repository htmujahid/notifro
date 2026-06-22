import { TrashIcon } from "lucide-react"

import type { ProviderFallback } from "@notifro/api-client/types"
import { type ColumnDef } from "@notifro/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@notifro/ui-primitives/components/data-table-column-header"

interface FailoverColumnsOptions {
  onDelete: (id: string) => void
}

export function getFailoverColumns({
  onDelete,
}: FailoverColumnsOptions): ColumnDef<ProviderFallback, unknown>[] {
  return [
    {
      accessorKey: "channel",
      meta: { label: "Channel" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Channel" />
      ),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "primaryConnectionId",
      meta: { label: "Primary" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Primary" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "fallbackConnectionId",
      meta: { label: "Fallback" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fallback" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <button
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(row.original.id)}
        >
          <TrashIcon className="size-3.5" />
        </button>
      ),
    },
  ]
}
