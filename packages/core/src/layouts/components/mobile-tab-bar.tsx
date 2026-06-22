import * as React from "react"

import {
  BarChart3Icon,
  BellIcon,
  CalendarIcon,
  CircleHelpIcon,
  CodeIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RadioIcon,
  ScrollIcon,
  Settings2Icon,
  UserIcon,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router"

import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@renderical/app/auth/context"
import { SESSION_QUERY_KEY, useSession } from "@renderical/app/auth/use-session"
import { Avatar, AvatarFallback } from "@renderical/ui/components/avatar"
import { Drawer, DrawerContent } from "@renderical/ui/components/drawer"

import { useUnreadCount } from "../../queries/inbox"
import { QuickCreateDialog } from "./quick-create-dialog"

const MORE_NAV = [
  { title: "Channels", url: "/channels", icon: RadioIcon },
  { title: "Templates", url: "/templates", icon: FileTextIcon },
  { title: "Logs", url: "/logs", icon: ScrollIcon },
  { title: "Analytics", url: "/analytics", icon: BarChart3Icon },
  { title: "Developers", url: "/developers", icon: CodeIcon },
]

const MORE_SECONDARY = [
  { title: "Settings", url: "/settings", icon: Settings2Icon },
  { title: "Help", url: "/help", icon: CircleHelpIcon },
]

export function MobileTabBar() {
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false)
  const { data: unreadData } = useUnreadCount()
  const unreadCount = unreadData?.count ?? 0
  const { data: session } = useSession()
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const name = session?.user?.name ?? ""
  const email = session?.user?.email ?? ""
  const initials = name
    ? name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.slice(0, 2).toUpperCase() || "U"

  async function handleSignOut() {
    await auth.signOut()
    queryClient.setQueryData(SESSION_QUERY_KEY, null)
    navigate("/auth/sign-in")
  }

  function handleMoreNav(url: string) {
    setMoreOpen(false)
    navigate(url)
  }

  return (
    <>
      <nav
        className="flex shrink-0 items-center border-t border-border bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`
          }
        >
          <LayoutDashboardIcon className="size-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`
          }
        >
          <span className="relative">
            <BellIcon className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span>Inbox</span>
        </NavLink>

        <button
          onClick={() => setQuickCreateOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <PlusIcon className="size-4" />
          </span>
          <span>Create</span>
        </button>

        <NavLink
          to="/schedules"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`
          }
        >
          <CalendarIcon className="size-5" />
          <span>Schedules</span>
        </NavLink>

        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <MoreHorizontalIcon className="size-5" />
          <span>More</span>
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar className="size-9 rounded-full">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="px-2 py-3">
            <div className="grid grid-cols-4 gap-1">
              {MORE_NAV.map(({ title, url, icon: Icon }) => (
                <button
                  key={title}
                  onClick={() => handleMoreNav(url)}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted"
                >
                  <Icon className="size-5" />
                  <span>{title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-2 py-2">
            {MORE_SECONDARY.map(({ title, url, icon: Icon }) => (
              <button
                key={title}
                onClick={() => handleMoreNav(url)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {title}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setMoreOpen(false)
                navigate("/account")
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <UserIcon className="size-4" />
              Profile & Account
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOutIcon className="size-4" />
              Log out
            </button>
          </div>
          <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
        </DrawerContent>
      </Drawer>

      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
      />
    </>
  )
}
