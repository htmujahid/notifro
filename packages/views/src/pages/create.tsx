import { useState } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react"
import { useSendNotification, type NotificationWithDeliveries } from "@workspace/core/hooks/notifications"

const CREATE_OPTIONS = [
  {
    title: "Notification",
    description: "Send a one-off message to a specific channel or audience right now.",
    icon: BellIcon,
    action: "compose" as const,
    cta: "New notification",
    bullets: ["Choose email, Slack, push, or webhook", "Target an audience or a single recipient", "Deliver immediately or at a set time"],
  },
  {
    title: "Schedule",
    description: "Automate recurring notifications using a cron expression.",
    icon: CalendarIcon,
    action: "navigate" as const,
    url: "/schedules",
    cta: "New schedule",
    bullets: ["Define a cron expression for recurrence", "Attach a template or write inline", "Pause, resume, or delete at any time"],
  },
  {
    title: "Template",
    description: "Create a reusable message template with dynamic variables.",
    icon: FileTextIcon,
    action: "navigate" as const,
    url: "/templates",
    cta: "New template",
    bullets: ["Supports {{variable}} interpolation", "Shared across notifications and schedules", "Versioned — edits don't break existing sends"],
  },
  {
    title: "Audience",
    description: "Segment your recipients into a named, reusable group.",
    icon: UsersIcon,
    action: "navigate" as const,
    url: "/audiences",
    cta: "New audience",
    bullets: ["Static lists or dynamic rule-based groups", "Reference by name in any notification", "Size recalculated automatically for dynamic groups"],
  },
]

export default function CreatePage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [result, setResult] = useState<NotificationWithDeliveries | null>(null)

  const send = useSendNotification()

  function handleOpen() {
    setOpen(true)
    setResult(null)
    setTo("")
    setSubject("")
    setBody("")
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const data = await send.mutateAsync({
      content: {
        subject,
        body: { text: body },
      },
      recipient: { type: "contact", email: to },
      channels: ["email"],
    })
    setResult(data)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what you'd like to build in Renderical.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CREATE_OPTIONS.map((option) => {
          const { title, description, icon: Icon, cta, bullets, action } = option
          return (
            <Card key={title} size="sm" className="flex flex-col">
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-foreground" />
                </div>
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <ul className="flex flex-col gap-1.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    if (action === "compose") {
                      handleOpen()
                    } else if (action === "navigate" && "url" in option) {
                      navigate(option.url as string)
                    }
                  }}
                >
                  {cta}
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium">Notification sent</p>
              <div className="flex flex-col gap-2">
                {result.deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                    {d.status === "delivered" || d.status === "sent" ? (
                      <CheckCircleIcon className="size-4 shrink-0 text-green-600" />
                    ) : (
                      <XCircleIcon className="size-4 shrink-0 text-destructive" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{d.channel}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.status}{d.error ? ` — ${d.error}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="to">Recipient email</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="user@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Notification subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Write your message…"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              {send.isError && (
                <p className="text-xs text-destructive">
                  {send.error instanceof Error ? send.error.message : "Send failed"}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={send.isPending}>
                  {send.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
