import {
  BellIcon,
  CheckIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  SmartphoneIcon,
  WebhookIcon,
} from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@renderical/ui/components/card"

import { useConnections } from "../../hooks/connections"
import { usePushRegistration } from "../../hooks/push"
import { useWebhooks } from "../../hooks/webhooks"
import { ConnectionDialog } from "./connection-dialog"
import { WebhookManager } from "./webhook-manager"

const CHANNEL_META: Record<
  string,
  {
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  email: {
    name: "Email",
    description:
      "Send notifications via Cloudflare Email. No OAuth required — always available.",
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
    description:
      "Send WhatsApp messages via Twilio using a whatsapp: sender number.",
    icon: MessageSquareIcon,
  },
  telegram: {
    name: "Telegram",
    description: "Send messages via a Telegram Bot to any chat or channel.",
    icon: MessageSquareIcon,
  },
  slack: {
    name: "Slack",
    description:
      "Post Block Kit messages to a Slack channel via a bot token. No OAuth required.",
    icon: MessageSquareIcon,
  },
  discord: {
    name: "Discord",
    description:
      "Post rich embeds to a Discord channel via an incoming webhook URL. No OAuth required.",
    icon: MessageSquareIcon,
  },
  teams: {
    name: "Microsoft Teams",
    description:
      "Post Adaptive Cards to a Teams channel via a connector/workflow webhook URL. No OAuth required.",
    icon: MessageSquareIcon,
  },
  mobile_push: {
    name: "Mobile Push",
    description:
      "Native iOS & Android push via APNs and FCM. Devices register their token automatically.",
    icon: SmartphoneIcon,
  },
  in_app: {
    name: "In-App",
    description:
      "Real-time in-app notifications delivered to the bell inbox. Always available.",
    icon: BellIcon,
  },
}

const ALWAYS_ON = new Set(["email", "in_app"])

const CHANNEL_TYPES = [
  "email",
  "webhook",
  "web_push",
  "sms",
  "whatsapp",
  "telegram",
  "slack",
  "discord",
  "teams",
  "mobile_push",
  "in_app",
] as const

export function ChannelsView() {
  const { data, isLoading } = useConnections({ limit: 50 })
  const push = usePushRegistration()
  const { data: webhookData } = useWebhooks({ limit: 100 })

  const connections = data?.pages.flatMap((p) => p.data) ?? []
  const webhooks = webhookData?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Channels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect and configure the channels you deliver notifications through.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNEL_TYPES.map((type) => (
            <Card key={type} size="sm" className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNEL_TYPES.map((type) => {
            const meta = CHANNEL_META[type]
            if (!meta) return null
            const { name, description, icon: Icon } = meta
            const conn = connections.find((c) => c.type === type)

            let connected: boolean
            let detail: string
            let actionNode: React.ReactNode

            if (ALWAYS_ON.has(type)) {
              connected = true
              detail =
                type === "email"
                  ? "Cloudflare Email binding"
                  : "Delivered to the bell inbox"
              actionNode = (
                <p className="text-xs text-muted-foreground">
                  Active — no configuration needed.
                </p>
              )
            } else if (type === "webhook") {
              const enabledCount = webhooks.filter((w) => w.enabled).length
              connected = enabledCount > 0
              detail =
                webhooks.length === 0
                  ? "No endpoints configured"
                  : `${webhooks.length} endpoint${webhooks.length === 1 ? "" : "s"} · ${enabledCount} enabled`
              actionNode = (
                <WebhookManager
                  trigger={
                    <Button
                      size="sm"
                      variant={connected ? "outline" : "default"}
                      className="w-full"
                    >
                      {webhooks.length > 0 ? "Manage" : "Add endpoint"}
                    </Button>
                  }
                />
              )
            } else if (type === "web_push") {
              connected = push.subscribed
              detail = !push.supported
                ? "Not supported in this browser"
                : push.permission === "denied"
                  ? "Permission denied — enable in browser settings"
                  : push.subscribed
                    ? "Browser notifications active"
                    : "Click to enable browser notifications"
              actionNode = (
                <Button
                  size="sm"
                  variant={push.subscribed ? "outline" : "default"}
                  className="w-full"
                  onClick={push.subscribed ? push.disable : push.enable}
                  disabled={
                    !push.supported ||
                    push.permission === "denied" ||
                    push.loading
                  }
                >
                  {push.loading
                    ? "..."
                    : push.subscribed
                      ? "Disable"
                      : "Enable"}
                </Button>
              )
            } else {
              connected = conn?.status === "active"
              detail = conn ? conn.name : "Not configured"
              actionNode = (
                <ConnectionDialog
                  type={type}
                  existing={conn}
                  trigger={
                    <Button
                      size="sm"
                      variant={connected ? "outline" : "default"}
                      className="w-full"
                    >
                      {connected ? "Manage" : "Connect"}
                    </Button>
                  }
                />
              )
            }

            return (
              <Card key={type} size="sm">
                <CardHeader>
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
                            <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                              Connected
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>{description}</CardDescription>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{detail}</span>
                  </div>
                  {actionNode}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
