import { RefreshCwIcon } from "lucide-react"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { Button } from "@renderical/ui/components/button"

import { useTableQueryState } from "../../hooks/use-table-query-state"
import { useDeliveries, useRetryDelivery } from "../../queries/deliveries"
import { LogsTable } from "./logs-table"

const TABS = ["All", "Delivered", "Failed", "Bounced"] as const
type Tab = (typeof TABS)[number]

const TAB_STATUS: Record<Tab, string> = {
  All: "",
  Delivered: "delivered",
  Failed: "failed",
  Bounced: "bounced",
}

export function LogsView() {
  const { listParams, tableState, filters, setFilter } = useTableQueryState({
    defaultSort: "createdAt",
    defaultOrder: "desc",
    filterKeys: ["status"],
  })

  const query = useDeliveries(listParams)
  const retry = useRetryDelivery()

  const rows = query.data?.data ?? []
  const hasMore = query.data?.nextCursor != null
  const activeStatus = filters.status ?? ""

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
            onClick={() => setFilter("status", TAB_STATUS[tab] || null)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              activeStatus === TAB_STATUS[tab]
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <LogsTable
        data={rows}
        loading={query.isLoading}
        hasMore={hasMore}
        tableState={tableState}
        onRetry={retry.mutate}
        retryPending={retry.isPending}
        emptyState={
          query.isLoading
            ? "Loading deliveries…"
            : "No entries. Delivery logs will appear here once you start sending notifications."
        }
      />
    </div>
  )
}
