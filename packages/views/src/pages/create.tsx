import { useNavigate } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react"

const CREATE_OPTIONS = [
  {
    title: "Notification",
    description: "Send a one-off message to a specific channel or audience right now.",
    icon: BellIcon,
    url: "/notifications",
    cta: "New notification",
    bullets: ["Choose email, Slack, push, or webhook", "Target an audience or a single recipient", "Deliver immediately or at a set time"],
  },
  {
    title: "Schedule",
    description: "Automate recurring notifications using a cron expression.",
    icon: CalendarIcon,
    url: "/schedules",
    cta: "New schedule",
    bullets: ["Define a cron expression for recurrence", "Attach a template or write inline", "Pause, resume, or delete at any time"],
  },
  {
    title: "Template",
    description: "Create a reusable message template with dynamic variables.",
    icon: FileTextIcon,
    url: "/templates",
    cta: "New template",
    bullets: ["Supports {{variable}} interpolation", "Shared across notifications and schedules", "Versioned — edits don't break existing sends"],
  },
  {
    title: "Audience",
    description: "Segment your recipients into a named, reusable group.",
    icon: UsersIcon,
    url: "/audiences",
    cta: "New audience",
    bullets: ["Static lists or dynamic rule-based groups", "Reference by name in any notification", "Size recalculated automatically for dynamic groups"],
  },
]

export default function CreatePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what you'd like to build in Renderical.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CREATE_OPTIONS.map(({ title, description, icon: Icon, url, cta, bullets }) => (
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
                onClick={() => navigate(url)}
              >
                {cta}
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
