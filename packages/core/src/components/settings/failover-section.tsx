import { useState } from "react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"
import { GitForkIcon, PlusIcon, TrashIcon } from "lucide-react"

import {
  useCreateProviderFallback,
  useDeleteProviderFallback,
  useProviderFallbacks,
} from "../../hooks/failover"

export function FailoverSection() {
  const { data } = useProviderFallbacks()
  const createFallback = useCreateProviderFallback()
  const deleteFallback = useDeleteProviderFallback()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [primaryId, setPrimaryId] = useState("")
  const [fallbackId, setFallbackId] = useState("")

  const rules = data?.data ?? []

  function handleCreate() {
    if (!channel || !primaryId || !fallbackId) return
    createFallback.mutate(
      {
        channel,
        primaryConnectionId: primaryId,
        fallbackConnectionId: fallbackId,
      },
      {
        onSuccess: () => {
          setChannel("")
          setPrimaryId("")
          setFallbackId("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Provider failover</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When a channel send fails with a non-retryable error, automatically
            retry with a fallback connection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GitForkIcon className="size-4 text-muted-foreground" />
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
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Channel</span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm"
                placeholder="sms"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Primary connection ID</span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
                placeholder="connection UUID"
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">
                Fallback connection ID
              </span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
                placeholder="connection UUID"
                value={fallbackId}
                onChange={(e) => setFallbackId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={
                  createFallback.isPending ||
                  !channel ||
                  !primaryId ||
                  !fallbackId
                }
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

      {rules.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Channel
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Primary
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Fallback
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 font-medium">{rule.channel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {rule.primaryConnectionId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {rule.fallbackConnectionId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteFallback.mutate(rule.id)}
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
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
