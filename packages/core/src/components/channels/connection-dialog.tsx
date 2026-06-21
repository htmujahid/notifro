import React, { useState } from "react"

import { ActivityIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { Textarea } from "@renderical/ui/components/textarea"

import {
  type Connection,
  useConnectionHealth,
  useCreateConnection,
  useDeleteConnection,
  useUpdateConnection,
} from "../../hooks/connections"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

type FieldGroup = "config" | "credentials"

interface FieldSpec {
  key: string
  label: string
  placeholder?: string
  group: FieldGroup
  secret?: boolean
  multiline?: boolean
  required?: boolean
  help?: string
}

interface ChannelForm {
  title: string
  blurb: string
  fields: FieldSpec[]
}

export const CHANNEL_FORMS: Record<string, ChannelForm> = {
  sms: {
    title: "SMS (Twilio)",
    blurb: "Send text messages through your Twilio account.",
    fields: [
      {
        key: "from",
        label: "From number",
        placeholder: "+15551234567",
        group: "config",
        required: true,
      },
      {
        key: "accountSid",
        label: "Twilio Account SID",
        placeholder: "AC…",
        group: "credentials",
        required: true,
      },
      {
        key: "authToken",
        label: "Twilio Auth Token",
        group: "credentials",
        secret: true,
        required: true,
      },
    ],
  },
  whatsapp: {
    title: "WhatsApp (Twilio)",
    blurb: "Send WhatsApp messages through Twilio using a whatsapp: sender.",
    fields: [
      {
        key: "from",
        label: "From number",
        placeholder: "whatsapp:+15551234567",
        group: "config",
        required: true,
      },
      {
        key: "accountSid",
        label: "Twilio Account SID",
        placeholder: "AC…",
        group: "credentials",
        required: true,
      },
      {
        key: "authToken",
        label: "Twilio Auth Token",
        group: "credentials",
        secret: true,
        required: true,
      },
    ],
  },
  telegram: {
    title: "Telegram Bot",
    blurb: "Post messages to a chat or channel via a Telegram bot.",
    fields: [
      {
        key: "chatId",
        label: "Chat ID",
        placeholder: "-1001234567890",
        group: "config",
        required: true,
      },
      {
        key: "botToken",
        label: "Bot token",
        placeholder: "123456:ABC-DEF…",
        group: "credentials",
        secret: true,
        required: true,
      },
    ],
  },
  slack: {
    title: "Slack",
    blurb: "Post Block Kit messages to a channel via a bot token (xoxb-…).",
    fields: [
      {
        key: "channelId",
        label: "Channel ID",
        placeholder: "C0123456789",
        group: "config",
        required: true,
      },
      {
        key: "botToken",
        label: "Bot token",
        placeholder: "xoxb-…",
        group: "credentials",
        secret: true,
        required: true,
      },
    ],
  },
  discord: {
    title: "Discord",
    blurb: "Post rich embeds to a channel via an incoming webhook URL.",
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://discord.com/api/webhooks/…",
        group: "credentials",
        secret: true,
        required: true,
      },
      {
        key: "username",
        label: "Override username (optional)",
        placeholder: "Renderical",
        group: "config",
      },
      {
        key: "avatarUrl",
        label: "Override avatar URL (optional)",
        placeholder: "https://…/avatar.png",
        group: "config",
      },
    ],
  },
  teams: {
    title: "Microsoft Teams",
    blurb: "Post Adaptive Cards via a connector or workflow webhook URL.",
    fields: [
      {
        key: "connectorUrl",
        label: "Connector / workflow URL",
        placeholder: "https://…webhook.office.com/…",
        group: "credentials",
        secret: true,
        required: true,
      },
      {
        key: "cardVersion",
        label: "Adaptive Card version (optional)",
        placeholder: "1.5",
        group: "config",
      },
    ],
  },
  mobile_push: {
    title: "Mobile Push (APNs / FCM)",
    blurb:
      "Provide APNs and/or FCM credentials. Devices register their tokens automatically from the native apps.",
    fields: [
      {
        key: "apns.keyId",
        label: "APNs Key ID",
        placeholder: "ABC123DEFG",
        group: "credentials",
        help: "Apple token-based auth",
      },
      {
        key: "apns.teamId",
        label: "APNs Team ID",
        placeholder: "TEAM123456",
        group: "credentials",
      },
      {
        key: "apns.bundleId",
        label: "iOS Bundle ID",
        placeholder: "com.example.app",
        group: "credentials",
      },
      {
        key: "apns.p8",
        label: "APNs .p8 key",
        placeholder: "-----BEGIN PRIVATE KEY-----",
        group: "credentials",
        secret: true,
        multiline: true,
      },
      {
        key: "fcm.projectId",
        label: "FCM Project ID",
        placeholder: "my-firebase-project",
        group: "credentials",
        help: "Firebase Cloud Messaging",
      },
      {
        key: "fcm.serviceAccountJson",
        label: "FCM service account JSON",
        placeholder: '{ "type": "service_account", … }',
        group: "credentials",
        secret: true,
        multiline: true,
      },
    ],
  },
}

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: string
): void {
  const parts = path.split(".")
  let node = target
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (typeof node[part] !== "object" || node[part] === null) node[part] = {}
    node = node[part] as Record<string, unknown>
  }
  node[parts[parts.length - 1]!] = value
}

function getConfigValue(config: string, key: string): string {
  try {
    const parsed = JSON.parse(config) as Record<string, unknown>
    const v = parsed[key]
    return typeof v === "string" ? v : ""
  } catch {
    return ""
  }
}

interface ConnectionDialogProps {
  type: string
  existing?: Connection
  trigger: React.ReactElement
}

export function ConnectionDialog({
  type,
  existing,
  trigger,
}: ConnectionDialogProps) {
  const form = CHANNEL_FORMS[type]
  const [open, setOpen] = useState(false)
  const create = useCreateConnection()
  const update = useUpdateConnection(existing?.id ?? "")
  const remove = useDeleteConnection()
  const health = useConnectionHealth(existing?.id ?? "")

  const [name, setName] = useState(existing?.name ?? form?.title ?? type)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    for (const f of form?.fields ?? []) {
      seed[f.key] =
        f.group === "config" && existing
          ? getConfigValue(existing.config, f.key)
          : ""
    }
    return seed
  })
  const [error, setError] = useState<string | null>(null)

  if (!form) return trigger

  const missingRequired = form.fields
    .filter((f) => f.required && !existing)
    .some((f) => !values[f.key]?.trim())

  function buildPayload() {
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const f of form!.fields) {
      const raw = values[f.key]?.trim()
      if (!raw) continue
      if (f.group === "config") config[f.key] = raw
      else setPath(credentials, f.key, raw)
    }
    return { config, credentials }
  }

  async function handleSubmit() {
    setError(null)
    const { config, credentials } = buildPayload()
    try {
      if (existing) {
        await update.mutateAsync({
          name,
          config,
          ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        })
        toast.success(`${form!.title} updated`)
      } else {
        await create.mutateAsync({ type, name, config, credentials })
        toast.success(`${form!.title} connected`)
      }
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save connection")
    }
  }

  async function handleTest() {
    try {
      const result = await health.mutateAsync()
      if (result.ok) toast.success(result.message ?? "Connection healthy")
      else toast.error(result.message ?? "Connection check failed")
    } catch {
      toast.error("Health check failed")
    }
  }

  async function handleDelete() {
    if (!existing) return
    try {
      await remove.mutateAsync(existing.id)
      toast.success(`${form!.title} disconnected`)
      setOpen(false)
    } catch {
      toast.error("Failed to disconnect")
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: "contents" }}>
        {trigger}
      </span>
      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {existing ? `Manage ${form.title}` : `Connect ${form.title}`}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>{form.blurb}</ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conn-name">Connection name</Label>
              <Input
                id="conn-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {form.fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`conn-${f.key}`}>{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    id={`conn-${f.key}`}
                    placeholder={f.placeholder}
                    rows={3}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    id={`conn-${f.key}`}
                    type={f.secret ? "password" : "text"}
                    placeholder={
                      existing && f.secret
                        ? "•••••• (leave blank to keep)"
                        : f.placeholder
                    }
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                )}
                {f.help && (
                  <p className="text-xs text-muted-foreground">{f.help}</p>
                )}
              </div>
            ))}

            {existing && (
              <p className="text-xs text-muted-foreground">
                Secrets are stored encrypted and never shown again. Leave secret
                fields blank to keep the current values.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-2 pb-1 pt-1">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || missingRequired}
              >
                {saving ? "Saving…" : existing ? "Save changes" : "Connect"}
              </Button>
              {existing && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleTest}
                    disabled={health.isPending}
                  >
                    <ActivityIcon className="size-4" />
                    {health.isPending ? "Testing…" : "Test"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                    disabled={remove.isPending}
                  >
                    <Trash2Icon className="size-4" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </ResponsiveModalBody>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
