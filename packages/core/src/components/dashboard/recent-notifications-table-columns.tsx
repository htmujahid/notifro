import { type ColumnDef } from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"

export type RecentNotification = {
  id: string
  subject: string | null
  channels: string
  status: string
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseChannels(channels: string): string {
  try {
    return (JSON.parse(channels) as string[]).join(", ")
  } catch {
    return channels
  }
}

export function getRecentNotificationsColumns(): ColumnDef<
  RecentNotification,
  unknown
>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => row.subject ?? "Untitled",
      meta: { label: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      id: "channels",
      accessorFn: (row) => parseChannels(row.channels),
      meta: { label: "Channels" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Channels" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ getValue }) => {
        const status = getValue() as string
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: "createdAt",
      meta: { label: "Time" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Time" />
      ),
      enableGlobalFilter: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatDate(getValue() as string)}
        </span>
      ),
    },
  ]
}
