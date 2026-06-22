import { useState } from "react"

import { PlusIcon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { Textarea } from "@renderical/ui/components/textarea"

import { useCreateWebhook } from "../../queries/webhooks"

export function AddWebhookForm({
  onCreated,
}: {
  onCreated: (secret: string) => void
}) {
  const create = useCreateWebhook()
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [headers, setHeaders] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    let parsedHeaders: Record<string, string> | undefined
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers) as Record<string, string>
      } catch {
        setError("Headers must be valid JSON")
        return
      }
    }
    try {
      const result = await create.mutateAsync({
        url,
        description: description || undefined,
        headers: parsedHeaders,
      })
      setUrl("")
      setDescription("")
      setHeaders("")
      onCreated(result.secret)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create endpoint")
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-url">Endpoint URL</Label>
        <Input
          id="wh-url"
          placeholder="https://example.com/queries/renderical"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-desc">Description (optional)</Label>
        <Input
          id="wh-desc"
          placeholder="Production relay"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-headers">Custom headers JSON (optional)</Label>
        <Textarea
          id="wh-headers"
          placeholder='{"X-Custom": "value"}'
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleCreate}
        disabled={create.isPending || !url}
        className="gap-1.5 self-start"
      >
        <PlusIcon className="size-4" />
        {create.isPending ? "Adding…" : "Add endpoint"}
      </Button>
    </div>
  )
}
