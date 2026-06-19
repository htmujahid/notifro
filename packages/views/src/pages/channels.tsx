import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { MailIcon, MessageSquareIcon, WebhookIcon, BellIcon, CheckIcon, PlusIcon, SettingsIcon } from "lucide-react"

const CHANNELS = [
  {
    id: "email",
    name: "Email",
    description: "Send notifications to any email address. Powered by Cloudflare Email.",
    icon: MailIcon,
    connected: true,
    detail: "via Cloudflare Email Routing",
    count: 842,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post messages and alerts directly to your Slack workspace channels.",
    icon: MessageSquareIcon,
    connected: true,
    detail: "renderical-workspace",
    count: 317,
  },
  {
    id: "webhook",
    name: "Webhook",
    description: "POST notification payloads to any HTTP endpoint you control.",
    icon: WebhookIcon,
    connected: true,
    detail: "3 endpoints configured",
    count: 78,
  },
  {
    id: "push",
    name: "Push",
    description: "Native push notifications for web and mobile apps via Web Push API.",
    icon: BellIcon,
    connected: false,
    detail: "Not configured",
    count: 0,
  },
]

export default function ChannelsPage() {
  const [channels, setChannels] = useState(CHANNELS)

  function toggleChannel(id: string) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c))
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect and configure the channels you deliver notifications through.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5">
          <PlusIcon className="size-4" />
          Add channel
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {channels.map(({ id, name, description, icon: Icon, connected, detail, count }) => (
          <Card key={id} size="sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle>{name}</CardTitle>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {connected ? (
                        <>
                          <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-700 dark:text-green-400 font-medium">Connected</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Settings"
                >
                  <SettingsIcon className="size-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{description}</CardDescription>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{detail}</span>
                {connected && <span>{count.toLocaleString()} sent</span>}
              </div>
              <Button
                size="sm"
                variant={connected ? "outline" : "default"}
                className="w-full"
                onClick={() => toggleChannel(id)}
              >
                {connected ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
