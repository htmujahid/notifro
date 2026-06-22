import { RotateCwIcon } from "lucide-react"

import type { Delivery } from "@renderical/api-client/types"
import { type ColumnDef } from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { Button } from "@renderical/ui/components/button"

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-700 dark:text-green-400",
  opened: "bg-green-500/10 text-green-700 dark:text-green-400",
  clicked: "bg-green-500/10 text-green-700 dark:text-green-400",
  queued: "bg-muted text-muted-foreground",
  retrying: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
  dead: "bg-destructive/10 text-destructive",
  bounced: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

interface LogsColumnsOptions {
  onRetry: (id: string) => void
  retryPending: boolean
}

export function getLogsColumns({
  onRetry,
  retryPending,
}: LogsColumnsOptions): ColumnDef<Delivery, unknown>[] {
  return [
    {
      accessorKey: "notificationId",
      meta: { label: "Notification" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Notification" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "channel",
      meta: { label: "Channel" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Channel" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground capitalize">
          {(getValue() as string).replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "recipient",
      meta: { label: "Recipient" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Recipient" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ getValue }) => {
        const s = getValue() as string
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[s] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </span>
        )
      },
    },
    {
      accessorKey: "attempts",
      meta: { label: "Attempts" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Attempts" />
      ),
      enableGlobalFilter: false,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() as number}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { label: "Timestamp" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timestamp" />
      ),
      enableGlobalFilter: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatTimestamp(getValue() as string)}
        </span>
      ),
    },
    {
      id: "actions",
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const d = row.original
        if (d.status !== "failed" && d.status !== "dead") return null
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            disabled={retryPending}
            onClick={() => onRetry(d.id)}
          >
            <RotateCwIcon className="size-3.5" />
            Retry
          </Button>
        )
      },
    },
  ]
}
