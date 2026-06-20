import { Button } from "@workspace/ui/components/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { MailIcon, WebhookIcon, BellIcon, MessageSquareIcon, PhoneIcon, CheckIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { useConnections } from "@workspace/core/hooks/connections"

const CHANNEL_META: Record<string, { name: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  email: {
    name: "Email",
    description: "Send notifications via Cloudflare Email. No OAuth required — always available.",
    icon: MailIcon,
  },
  webhook: {
    name: "Webhook",
    description: "POST notification payloads to any HTTP endpoint you control.",
    icon: WebhookIcon,
  },
  web_push: {
    name: "Web Push",
    description: "Native push notifications for web apps via the Web Push API.",
    icon: BellIcon,
  },
  sms: {
    name: "SMS",
    description: "Send text messages via Twilio to any phone number worldwide.",
    icon: PhoneIcon,
  },
  whatsapp: {
    name: "WhatsApp",
    description: "Send WhatsApp messages via Twilio — reuses your SMS connection credentials.",
    icon: MessageSquareIcon,
  },
  telegram: {
    name: "Telegram",
    description: "Send messages via a Telegram Bot to any chat or channel.",
    icon: MessageSquareIcon,
  },
  in_app: {
    name: "In-App",
    description: "Real-time in-app notifications delivered to your frontend via WebSocket or polling.",
    icon: BellIcon,
  },
}

export default function ChannelsPage() {
  const { data, isLoading } = useConnections({ limit: 50 })

  const connections = data?.pages.flatMap((p) => p.data) ?? []

  const channelTypes = ["email", "webhook", "web_push", "sms", "whatsapp", "telegram", "in_app"] as const

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
            const { name, description, icon: Icon } = meta
            const conn = connections.find((c) => c.type === type)
            const connected = type === "email" ? true : conn?.status === "active"
            const detail = type === "email" ? "Cloudflare Email binding" : conn ? conn.name : "Not configured"

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
