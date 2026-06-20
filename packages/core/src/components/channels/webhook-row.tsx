import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import { SendIcon, Trash2Icon } from "lucide-react"
import { useUpdateWebhook, useDeleteWebhook, useTestWebhook, type WebhookEndpoint } from "../../hooks/webhooks"

export function WebhookRow({ endpoint }: { endpoint: WebhookEndpoint }) {
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
