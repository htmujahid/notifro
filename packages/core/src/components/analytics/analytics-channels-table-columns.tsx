import type { AnalyticsChannelRow } from "@notifro/api-client/types"
import { type ColumnDef } from "@notifro/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@notifro/ui-primitives/components/data-table-column-header"

function pct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function getAnalyticsChannelsColumns(): ColumnDef<
  AnalyticsChannelRow,
  unknown
>[] {
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
      accessorKey: "sent",
      meta: { label: "Sent" },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Sent"
          className="ml-auto"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right text-muted-foreground">
          {(getValue() as number).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "delivered",
      meta: { label: "Delivered" },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Delivered"
          className="ml-auto"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right text-muted-foreground">
          {(getValue() as number).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "deliveryRate",
      meta: { label: "Rate" },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Rate"
          className="ml-auto"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right font-medium text-green-700 dark:text-green-400">
          {pct(getValue() as number)}
        </span>
      ),
    },
  ]
}
