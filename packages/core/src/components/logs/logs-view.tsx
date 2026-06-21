import { useState } from "react"

import { RefreshCwIcon } from "lucide-react"

import {
  type ColumnDef,
  DataTable,
} from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"
import { Button } from "@renderical/ui/components/button"

const ALL_LOGS = [
  {
    id: "log_01",
    notification: "Weekly digest",
    channel: "Email",
    recipient: "all-users@group",
    status: "delivered",
    duration: "312ms",
    timestamp: "Jun 19, 09:00:04",
  },
  {
    id: "log_02",
    notification: "Payment reminder",
    channel: "Push",
    recipient: "user_4821",
    status: "delivered",
    duration: "89ms",
    timestamp: "Jun 19, 08:30:12",
  },
  {
    id: "log_03",
    notification: "Low inventory alert",
    channel: "Slack",
    recipient: "#ops-team",
    status: "delivered",
    duration: "204ms",
    timestamp: "Jun 19, 07:15:33",
  },
  {
    id: "log_04",
    notification: "Usage limit warning",
    channel: "Webhook",
    recipient: "api.example.com/hook",
    status: "failed",
    duration: "5002ms",
    timestamp: "Jun 18, 22:00:01",
  },
  {
    id: "log_05",
    notification: "New sign-up welcome",
    channel: "Email",
    recipient: "new@user.com",
    status: "delivered",
    duration: "418ms",
    timestamp: "Jun 18, 14:20:09",
  },
  {
    id: "log_06",
    notification: "Server alert: high CPU",
    channel: "Slack",
    recipient: "#incidents",
    status: "delivered",
    duration: "177ms",
    timestamp: "Jun 18, 11:05:44",
  },
  {
    id: "log_07",
    notification: "Subscription renewal",
    channel: "Email",
    recipient: "user_2034",
    status: "bounced",
    duration: "1201ms",
    timestamp: "Jun 18, 10:00:00",
  },
  {
    id: "log_08",
    notification: "Deployment hook",
    channel: "Webhook",
    recipient: "ci.internal/deploy",
    status: "delivered",
    duration: "95ms",
    timestamp: "Jun 17, 16:42:11",
  },
  {
    id: "log_09",
    notification: "Monthly invoice reminder",
    channel: "Email",
    recipient: "subscribed@group",
    status: "delivered",
    duration: "522ms",
    timestamp: "Jun 17, 10:01:00",
  },
  {
    id: "log_10",
    notification: "Backup webhook ping",
    channel: "Webhook",
    recipient: "api.internal/health",
    status: "failed",
    duration: "5001ms",
    timestamp: "Jun 17, 09:45:00",
  },
]

const TABS = ["All", "Delivered", "Failed", "Bounced"] as const
type Tab = (typeof TABS)[number]

type LogEntry = (typeof ALL_LOGS)[number]

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
  bounced: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
}

const COLUMNS: ColumnDef<LogEntry, unknown>[] = [
  {
    accessorKey: "notification",
    meta: { label: "Notification" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notification" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "channel",
    meta: { label: "Channel" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Channel" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
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
    accessorKey: "duration",
    meta: { label: "Duration" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Duration" />
    ),
    enableGlobalFilter: false,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "timestamp",
    meta: { label: "Timestamp" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    enableGlobalFilter: false,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
    ),
  },
]

export function LogsView() {
  const [activeTab, setActiveTab] = useState<Tab>("All")

  const filtered =
    activeTab === "All"
      ? ALL_LOGS
      : ALL_LOGS.filter((l) => l.status === activeTab.toLowerCase())

  const { table } = useDataTable({ data: filtered, columns: COLUMNS })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Delivery history for all outbound notifications."
      >
        <Button size="sm" variant="outline" className="gap-1.5">
          <RefreshCwIcon className="size-4" />
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
        emptyState={`No ${activeTab.toLowerCase()} entries. Delivery logs will appear here once you start sending notifications.`}
      >
        <DataTableToolbar table={table} searchPlaceholder="Search logs…" />
      </DataTable>
    </div>
  )
}
