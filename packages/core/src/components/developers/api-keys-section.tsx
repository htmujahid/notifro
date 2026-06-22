import { useState } from "react"

import { CopyIcon, KeyIcon, PlusIcon, TrashIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"

import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "../../queries/keys"

export function ApiKeysSection() {
  const { data, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [newKey, setNewKey] = useState<{ key: string } | null>(null)

  const keys = data ?? []

  function handleCreate() {
    if (!name) return
    createKey.mutate(
      { name },
      {
        onSuccess: (result) => {
          setNewKey(result)
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
          <h2 className="text-sm font-medium">API keys</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Authenticate server-to-server API calls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <KeyIcon className="size-4 text-muted-foreground" />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusIcon className="size-3.5" />
            New key
          </Button>
        </div>
      </div>

      {newKey && (
        <Card
          size="sm"
          className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
        >
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs font-medium text-green-800 dark:text-green-200">
              Key created. Copy it now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs font-mono">
                {newKey.key}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="size-7 shrink-0"
                onClick={() => navigator.clipboard.writeText(newKey.key)}
              >
                <CopyIcon className="size-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => setNewKey(null)}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="My key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={createKey.isPending || !name}
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

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 font-mono text-xs">
                {key.start ?? key.prefix}…
              </span>
              <span className="text-xs text-muted-foreground">{key.name}</span>
              <span className="text-xs text-muted-foreground">
                last used:{" "}
                {key.lastRequest
                  ? new Date(key.lastRequest).toLocaleDateString()
                  : "never"}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => revokeKey.mutate(key.id)}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
