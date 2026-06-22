import { useEffect } from "react"

import {
  BarChart3Icon,
  BellIcon,
  CalendarIcon,
  CircleHelpIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RadioIcon,
  RouteIcon,
  ScrollIcon,
  Settings2Icon,
  ShieldIcon,
  UserIcon,
} from "lucide-react"
import { useNavigate } from "react-router"

import { useApp } from "@notifro/app/app/context"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@notifro/ui/components/command"

export function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { isMobile } = useApp()

  useEffect(() => {
    if (isMobile) return
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange, isMobile])

  function run(to: string) {
    navigate(to)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => run("/")}>
              <LayoutDashboardIcon />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => run("/notifications")}>
              <BellIcon />
              Notifications
            </CommandItem>
            <CommandItem onSelect={() => run("/schedules")}>
              <CalendarIcon />
              Schedules
            </CommandItem>
            <CommandItem onSelect={() => run("/channels")}>
              <RadioIcon />
              Channels
            </CommandItem>
            <CommandItem onSelect={() => run("/routing")}>
              <RouteIcon />
              Routing
            </CommandItem>
            <CommandItem onSelect={() => run("/templates")}>
              <FileTextIcon />
              Templates
            </CommandItem>
            <CommandItem onSelect={() => run("/logs")}>
              <ScrollIcon />
              Logs
            </CommandItem>
            <CommandItem onSelect={() => run("/analytics")}>
              <BarChart3Icon />
              Analytics
            </CommandItem>
            <CommandItem onSelect={() => run("/settings")}>
              <Settings2Icon />
              Settings
            </CommandItem>
            <CommandItem onSelect={() => run("/help")}>
              <CircleHelpIcon />
              Help
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => run("/create")}>
              <PlusIcon />
              Create something new
            </CommandItem>
            <CommandItem onSelect={() => run("/notifications")}>
              <PlusIcon />
              New notification
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run("/schedules")}>
              <PlusIcon />
              New schedule
            </CommandItem>
            <CommandItem onSelect={() => run("/channels")}>
              <RadioIcon />
              Add channel
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem onSelect={() => run("/account")}>
              <UserIcon />
              Profile
            </CommandItem>
            <CommandItem onSelect={() => run("/account/security")}>
              <ShieldIcon />
              Security
            </CommandItem>
            <CommandItem onSelect={() => run("/account/two-factor")}>
              <KeyRoundIcon />
              Two-factor auth
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
