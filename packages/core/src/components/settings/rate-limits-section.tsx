import { useState } from "react"

import { GaugeIcon, PlusIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import { useTableQueryState } from "../../hooks/use-table-query-state"
import {
  useDeleteRateLimit,
  useRateLimits,
  useUpsertRateLimit,
} from "../../queries/rate-limits"
import { RateLimitsTable } from "./rate-limits-table"

export function RateLimitsSection() {
  const { listParams, tableState } = useTableQueryState({
    defaultSort: "createdAt",
    defaultOrder: "desc",
  })
  const { data, isLoading } = useRateLimits(listParams)
  const upsert = useUpsertRateLimit()
  const deleteRule = useDeleteRateLimit()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [maxCount, setMaxCount] = useState("")
  const [windowSeconds, setWindowSeconds] = useState("")

  const rules = data?.data ?? []
  const hasMore = data?.nextCursor != null

  function handleCreate() {
    const mc = parseInt(maxCount, 10)
    const ws = parseInt(windowSeconds, 10)
    if (!channel || isNaN(mc) || isNaN(ws)) return
    upsert.mutate(
      { channel, maxCount: mc, windowSeconds: ws },
      {
        onSuccess: () => {
          setChannel("")
          setMaxCount("")
          setWindowSeconds("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Rate limits</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Limit how many notifications can be sent per channel per time
            window.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GaugeIcon className="size-4 text-muted-foreground" />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusIcon className="size-3.5" />
            Add rule
          </Button>
        </div>
      </div>

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Channel
                </label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="email"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Max count
                </label>
                <input
                  type="number"
                  min={1}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="100"
                  value={maxCount}
                  onChange={(e) => setMaxCount(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Window (seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="3600"
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={
                  upsert.isPending || !channel || !maxCount || !windowSeconds
                }
                onClick={handleCreate}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rate limit rules. Add one to cap sends per channel per window.
        </p>
      ) : (
        <RateLimitsTable
          data={rules}
          loading={isLoading}
          hasMore={hasMore}
          tableState={tableState}
          onDelete={deleteRule.mutate}
        />
      )}
    </section>
  )
}
