import { useNavigate } from "react-router"

import { BellIcon, CalendarIcon, FileTextIcon } from "lucide-react"

import { useApp } from "@notifro/app/app/context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@notifro/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@notifro/ui/components/drawer"

const OPTIONS = [
  {
    title: "Notification",
    description: "Send a one-off notification to a channel.",
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
] as const

function OptionGrid({ onSelect }: { onSelect: (url: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map(({ title, description, icon: Icon, url }) => (
        <button
          key={title}
          onClick={() => onSelect(url)}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
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
  )
}

export function QuickCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { isMobile } = useApp()

  function go(url: string) {
    navigate(url)
    onOpenChange(false)
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Quick create</DrawerTitle>
            <DrawerDescription>
              What would you like to create?
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <OptionGrid onSelect={go} />
          </div>
          <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick create</DialogTitle>
          <DialogDescription>What would you like to create?</DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <OptionGrid onSelect={go} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
