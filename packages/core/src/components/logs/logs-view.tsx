import { useState } from "react"

import { RefreshCwIcon } from "lucide-react"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { Button } from "@renderical/ui/components/button"

import { useDeliveries, useRetryDelivery } from "../../queries/deliveries"
import { LogsTable } from "./logs-table"

const TABS = ["All", "Delivered", "Failed", "Bounced"] as const
type Tab = (typeof TABS)[number]

const TAB_STATUS: Record<Tab, string | undefined> = {
  All: undefined,
  Delivered: "delivered",
  Failed: "failed",
  Bounced: "bounced",
}

export function LogsView() {
  const [activeTab, setActiveTab] = useState<Tab>("All")

  const query = useDeliveries({ status: TAB_STATUS[activeTab] })
  const retry = useRetryDelivery()

  const rows = query.data?.pages.flatMap((p) => p.data) ?? []

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

      <LogsTable
        data={rows}
        onRetry={retry.mutate}
        retryPending={retry.isPending}
        emptyState={
          query.isLoading
            ? "Loading deliveries…"
            : `No ${activeTab.toLowerCase()} entries. Delivery logs will appear here once you start sending notifications.`
        }
      />

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
