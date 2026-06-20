import { Button } from "@workspace/ui/components/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { MailIcon, MessageSquareIcon, WebhookIcon, BellIcon, CheckIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { useConnections } from "@workspace/core/hooks/connections"
import { useApiClient } from "@workspace/api-client/context"

const CHANNEL_META: Record<string, { name: string; description: string; icon: React.ComponentType<{ className?: string }>; connectPath?: string }> = {
  email: {
    name: "Email",
    description: "Send notifications via your Gmail account. Connects with Google OAuth.",
    icon: MailIcon,
    connectPath: "/api/connections/email/oauth/start",
  },
  slack: {
    name: "Slack",
    description: "Post messages and alerts directly to your Slack workspace channels.",
    icon: MessageSquareIcon,
  },
  webhook: {
    name: "Webhook",
    description: "POST notification payloads to any HTTP endpoint you control.",
    icon: WebhookIcon,
  },
  web_push: {
    name: "Push",
    description: "Native push notifications for web and mobile apps via Web Push API.",
    icon: BellIcon,
  },
}

export default function ChannelsPage() {
  const { data, isLoading } = useConnections({ limit: 50 })
  const apiClient = useApiClient()

  const connections = data?.pages.flatMap((p) => p.data) ?? []

  const channelTypes = ["email", "slack", "webhook", "web_push"] as const

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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {channelTypes.map((type) => (
            <Card key={type} size="sm" className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {channelTypes.map((type) => {
            const meta = CHANNEL_META[type]
            if (!meta) return null
            const { name, description, icon: Icon, connectPath } = meta
            const conn = connections.find((c) => c.type === type)
            const connected = conn?.status === "active"
            const detail = conn ? conn.name : "Not configured"
            const connectHref = connectPath ? `${apiClient.baseURL}${connectPath}` : undefined

            return (
              <Card key={type} size="sm">
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
                  </div>
                  <Button
                    size="sm"
                    variant={connected ? "outline" : "default"}
                    className="w-full"
                    onClick={() => {
                      if (!connected && connectHref) {
                        window.location.href = connectHref
                      }
                    }}
                  >
                    {connected ? "Manage" : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
