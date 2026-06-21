import { useState } from "react"

import { PlusIcon, TrashIcon, UsersIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@renderical/ui/components/empty"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import {
  useCreateRecipient,
  useDeleteRecipient,
  useRecipients,
} from "../../hooks/audiences"

export function RecipientsTab() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useRecipients()
  const createRecipient = useCreateRecipient()
  const deleteRecipient = useDeleteRecipient()
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState("")
  const [externalId, setExternalId] = useState("")

  const rows = data?.pages.flatMap((p) => p.data) ?? []

  async function handleAdd() {
    if (!email.trim()) return
    await createRecipient.mutateAsync({
      email: email.trim(),
      externalId: externalId.trim() || undefined,
    })
    setEmail("")
    setExternalId("")
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Individual contacts imported into the system.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <PlusIcon className="size-4" />
          Add contact
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">External ID (optional)</Label>
              <Input
                placeholder="user_123"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createRecipient.isPending || !email.trim()}
            >
              {createRecipient.isPending ? "Adding…" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No contacts yet</EmptyTitle>
            <EmptyDescription>
              Add contacts manually or via the identify API endpoint.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    External ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Locale
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      {r.email ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.externalId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.locale ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecipient.mutate(r.id)}
                      >
                        <TrashIcon className="size-3.5 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => fetchNextPage()}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  )
}
