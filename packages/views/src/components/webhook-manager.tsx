import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { CopyIcon, SendIcon, Trash2Icon, PlusIcon } from "lucide-react"
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type WebhookEndpoint,
} from "@workspace/core/hooks/webhooks"

function WebhookRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  const update = useUpdateWebhook(endpoint.id)
  const remove = useDeleteWebhook()
  const test = useTestWebhook()

  async function handleTest() {
    try {
      const result = await test.mutateAsync(endpoint.id)
      if (result.ok) toast.success(`Test delivered — HTTP ${result.status} in ${result.latencyMs}ms`)
      else toast.error(`Test failed — ${result.status ? `HTTP ${result.status}` : result.error} (${result.latencyMs}ms)`)
    } catch {
      toast.error("Test request failed")
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{endpoint.url}</p>
        <p className="text-xs text-muted-foreground">
          {endpoint.description ? `${endpoint.description} · ` : ""}secret ••••{endpoint.secretLast4}
        </p>
      </div>
      <Switch
        checked={endpoint.enabled}
        onCheckedChange={(checked) => update.mutate({ enabled: checked })}
        disabled={update.isPending}
      />
      <Button size="icon" variant="ghost" onClick={handleTest} disabled={test.isPending} title="Send test">
        <SendIcon className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => remove.mutate(endpoint.id)}
        disabled={remove.isPending}
        title="Delete"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}

function AddWebhookForm({ onCreated }: { onCreated: (secret: string) => void }) {
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
          placeholder="https://example.com/hooks/renderical"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-desc">Description (optional)</Label>
        <Input id="wh-desc" placeholder="Production relay" value={description} onChange={(e) => setDescription(e.target.value)} />
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
      <Button size="sm" onClick={handleCreate} disabled={create.isPending || !url} className="gap-1.5 self-start">
        <PlusIcon className="size-4" />
        {create.isPending ? "Adding…" : "Add endpoint"}
      </Button>
    </div>
  )
}

export function WebhookManager({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const { data, isLoading } = useWebhooks({ limit: 100 })

  const endpoints = data?.pages.flatMap((p) => p.data) ?? []

  function copySecret() {
    if (revealedSecret) {
      navigator.clipboard.writeText(revealedSecret)
      toast.success("Secret copied to clipboard")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setRevealedSecret(null)
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Webhook endpoints</DialogTitle>
          <DialogDescription>
            Deliver signed notification payloads to your HTTP endpoints. Each request is signed with HMAC-SHA256.
          </DialogDescription>
        </DialogHeader>

        {revealedSecret && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium">Signing secret — shown once</p>
            <p className="text-xs text-muted-foreground">
              Store this now. Use it to verify the <code>X-Renderical-Signature</code> header.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{revealedSecret}</code>
              <Button size="icon" variant="outline" onClick={copySecret} title="Copy secret">
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No endpoints yet. Add one below.</p>
          ) : (
            endpoints.map((ep) => <WebhookRow key={ep.id} endpoint={ep} />)
          )}
        </div>

        <AddWebhookForm onCreated={setRevealedSecret} />
      </DialogContent>
    </Dialog>
  )
}
