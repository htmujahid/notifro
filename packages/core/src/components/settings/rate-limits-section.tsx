import { useState } from "react"

import { GaugeIcon, PlusIcon, TrashIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import {
  useDeleteRateLimit,
  useRateLimits,
  useUpsertRateLimit,
} from "../../hooks/rate-limits"

export function RateLimitsSection() {
  const { data } = useRateLimits()
  const upsert = useUpsertRateLimit()
  const deleteRule = useDeleteRateLimit()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [maxCount, setMaxCount] = useState("")
  const [windowSeconds, setWindowSeconds] = useState("")

  const rules = data?.pages.flatMap((p) => p.data) ?? []

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
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Channel
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Max sends
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Window
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.channel}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.maxCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.windowSeconds}s
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteRule.mutate(r.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
