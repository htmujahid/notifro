import { useState } from "react"

import { BookmarkIcon, PlusIcon, TrashIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import {
  useCreateTopic,
  useDeleteTopic,
  useTopics,
} from "../../hooks/preferences"

export function SubscriptionsSection() {
  const { data } = useTopics()
  const createTopic = useCreateTopic()
  const deleteTopic = useDeleteTopic()
  const [showForm, setShowForm] = useState(false)
  const [key, setKey] = useState("")
  const [name, setName] = useState("")

  const topics = data?.pages.flatMap((p) => p.data) ?? []

  function handleCreate() {
    if (!key || !name) return
    createTopic.mutate(
      { key, name, transactional: true, defaultOptIn: true },
      {
        onSuccess: () => {
          setKey("")
          setName("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Notification topics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tags for organizing notifications in logs and analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-4 text-muted-foreground" />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusIcon className="size-3.5" />
            New topic
          </Button>
        </div>
      </div>

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Key
                </label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="product_updates"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Product Updates"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={createTopic.isPending || !key || !name}
                onClick={handleCreate}
              >
                Create
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

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No topics yet. Create one to tag notifications for filtering.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {t.key}
                  </td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteTopic.mutate(t.id)}
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
