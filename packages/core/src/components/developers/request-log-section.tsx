import { RefreshCwIcon, ScrollIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"

import { useRequestLog } from "../../hooks/request-log"

export function RequestLogSection() {
  const { data, isLoading, refetch, isFetching } = useRequestLog({ limit: 20 })
  const rows = data?.data ?? []

  function statusColor(status: number) {
    if (status < 300) return "text-green-600 dark:text-green-400"
    if (status < 400) return "text-yellow-600 dark:text-yellow-400"
    return "text-destructive"
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Request log</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recent API calls authenticated to your account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScrollIcon className="size-4 text-muted-foreground" />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCwIcon
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No requests logged yet.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 px-4 py-2.5 text-xs"
            >
              <span className="w-12 font-mono font-medium uppercase">
                {row.method}
              </span>
              <span
                className={`w-12 font-mono font-semibold ${statusColor(row.status)}`}
              >
                {row.status}
              </span>
              <span className="flex-1 font-mono text-muted-foreground">
                {row.path}
              </span>
              {row.latencyMs != null && (
                <span className="w-16 text-right text-muted-foreground">
                  {row.latencyMs}ms
                </span>
              )}
              <span className="w-24 text-right text-muted-foreground">
                {new Date(row.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
