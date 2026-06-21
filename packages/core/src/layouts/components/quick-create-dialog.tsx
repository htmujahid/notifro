import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { BellIcon, CalendarIcon, FileTextIcon, UsersIcon } from "lucide-react"
import { useNavigate } from "react-router"

const OPTIONS = [
  {
    title: "Notification",
    description: "Send a one-off notification to a channel or audience.",
    icon: BellIcon,
    url: "/create",
  },
  {
    title: "Schedule",
    description: "Set up a recurring notification on a cron schedule.",
    icon: CalendarIcon,
    url: "/schedules",
  },
  {
    title: "Template",
    description: "Create a reusable message template across channels.",
    icon: FileTextIcon,
    url: "/templates",
  },
  {
    title: "Audience",
    description: "Define a named group of recipients for targeting.",
    icon: UsersIcon,
    url: "/audiences",
  },
] as const

export function QuickCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()

  function go(url: string) {
    navigate(url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick create</DialogTitle>
          <DialogDescription>What would you like to create?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {OPTIONS.map(({ title, description, icon: Icon, url }) => (
            <button
              key={title}
              onClick={() => go(url)}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
