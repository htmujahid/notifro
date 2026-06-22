import { useState } from "react"

import { RefreshCwIcon, RotateCwIcon } from "lucide-react"

import type { Delivery } from "@renderical/api-client/types"
import {
  type ColumnDef,
  DataTable,
} from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"
import { Button } from "@renderical/ui/components/button"

import { useDeliveries, useRetryDelivery } from "../../queries/deliveries"

const TABS = ["All", "Delivered", "Failed", "Bounced"] as const
type Tab = (typeof TABS)[number]

const TAB_STATUS: Record<Tab, string | undefined> = {
  All: undefined,
  Delivered: "delivered",
  Failed: "failed",
  Bounced: "bounced",
}

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

export function LogsView() {
  const [activeTab, setActiveTab] = useState<Tab>("All")

  const query = useDeliveries({ status: TAB_STATUS[activeTab] })
  const retry = useRetryDelivery()

  const rows = query.data?.pages.flatMap((p) => p.data) ?? []

  const columns: ColumnDef<Delivery, unknown>[] = [
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
            disabled={retry.isPending}
            onClick={() => retry.mutate(d.id)}
          >
            <RotateCwIcon className="size-3.5" />
            Retry
          </Button>
        )
      },
    },
  ]

  const { table } = useDataTable({ data: rows, columns })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Delivery history for all outbound notifications."
      >
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCwIcon
            className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <DataTable
        table={table}
        emptyState={
          query.isLoading
            ? "Loading deliveries…"
            : `No ${activeTab.toLowerCase()} entries. Delivery logs will appear here once you start sending notifications.`
        }
      >
        <DataTableToolbar table={table} searchPlaceholder="Search logs…" />
      </DataTable>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
