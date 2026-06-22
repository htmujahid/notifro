import { useState } from "react"

import { PlusIcon, ShieldIcon, TrashIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import {
  useAddSuppression,
  useConsentEvents,
  useDeleteSuppression,
  useSuppressions,
} from "../../queries/compliance"

export function ComplianceSection() {
  const { data: suppData } = useSuppressions()
  const addSuppression = useAddSuppression()
  const deleteSuppression = useDeleteSuppression()
  const { data: ceData } = useConsentEvents()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [address, setAddress] = useState("")
  const [reason, setReason] = useState<"hard_bounce" | "complaint" | "manual">(
    "manual"
  )

  const suppressions = suppData?.pages.flatMap((p) => p.data) ?? []
  const consentEvents = ceData?.pages.flatMap((p) => p.data) ?? []

  function handleAdd() {
    if (!channel || !address) return
    addSuppression.mutate(
      { channel, address, reason },
      {
        onSuccess: () => {
          setChannel("")
          setAddress("")
          setReason("manual")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Compliance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Suppression list and consent event log.
          </p>
        </div>
        <ShieldIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Suppression list</p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusIcon className="size-3.5" />
            Add
          </Button>
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
                    Address
                  </label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="user@example.com"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Reason
                  </label>
                  <select
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as typeof reason)}
                  >
                    <option value="manual">Manual</option>
                    <option value="hard_bounce">Hard bounce</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={addSuppression.isPending || !channel || !address}
                  onClick={handleAdd}
                >
                  Add
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

        {suppressions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No suppressions. Add one to block delivery to a specific address.
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
                    Address
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {suppressions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {s.channel}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.address}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.reason}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteSuppression.mutate(s.id)}
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
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Consent event log</p>
        {consentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No consent events recorded yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {consentEvents.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.event === "opt_in" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {e.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {e.channel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.source}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
