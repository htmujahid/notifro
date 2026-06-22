import { useState } from "react"

import { GitForkIcon, PlusIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import {
  useCreateProviderFallback,
  useDeleteProviderFallback,
  useProviderFallbacks,
} from "../../queries/provider-fallbacks"
import { FailoverTable } from "./failover-table"

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
        <FailoverTable data={rules} onDelete={deleteFallback.mutate} />
      )}
    </section>
  )
}
