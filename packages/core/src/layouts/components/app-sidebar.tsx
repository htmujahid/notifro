import * as React from "react"

import { useAuth } from "@renderical/app/auth/context"
import { SESSION_QUERY_KEY, useSession } from "@renderical/app/auth/use-session"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@renderical/ui/components/sidebar"
import { RendericalMark } from "@renderical/core/components/renderical-logo"
import {
  BarChart3Icon,
  BellIcon,
  CalendarIcon,
  CircleHelpIcon,
  CodeIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  RadioIcon,
  RouteIcon,
  ScrollIcon,
  Settings2Icon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react"
import { Link, useNavigate } from "react-router"

import { useQueryClient } from "@tanstack/react-query"

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { QuickCreateDialog } from "./quick-create-dialog"

const NAV_MAIN = [
  {
    title: "Dashboard",
    url: "/",
    icon: <LayoutDashboardIcon className="size-4" />,
    end: true,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: <BellIcon className="size-4" />,
  },
  {
    title: "Schedules",
    url: "/schedules",
    icon: <CalendarIcon className="size-4" />,
  },
  {
    title: "Channels",
    url: "/channels",
    icon: <RadioIcon className="size-4" />,
  },
]

const NAV_SECONDARY = [
  {
    title: "Settings",
    url: "/settings",
    icon: <Settings2Icon className="size-4" />,
  },
  { title: "Help", url: "/help", icon: <CircleHelpIcon className="size-4" /> },
]

const NAV_DOCUMENTS = [
  {
    name: "Templates",
    url: "/templates",
    icon: <FileTextIcon className="size-4" />,
  },
  { name: "Logs", url: "/logs", icon: <ScrollIcon className="size-4" /> },
  {
    name: "Audiences",
    url: "/audiences",
    icon: <UsersIcon className="size-4" />,
  },
  {
    name: "Analytics",
    url: "/analytics",
    icon: <BarChart3Icon className="size-4" />,
  },
  { name: "Routing", url: "/routing", icon: <RouteIcon className="size-4" /> },
  {
    name: "Journeys",
    url: "/journeys",
    icon: <WorkflowIcon className="size-4" />,
  },
  {
    name: "Developers",
    url: "/developers",
    icon: <CodeIcon className="size-4" />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const auth = useAuth()
  const { data: session } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false)

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

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="data-[slot=sidebar-menu-button]:p-1.5!"
                render={<Link to="/" />}
              >
                <RendericalMark className="size-[18px]" />
                <span className="text-sm">Renderical</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain
            items={NAV_MAIN}
            onQuickCreate={() => setQuickCreateOpen(true)}
          />
          <NavDocuments items={NAV_DOCUMENTS} />
          <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
        </SidebarContent>

        <SidebarFooter>
          <NavUser
            user={{ name, email, initials }}
            onSignOut={handleSignOut}
            onNavigate={navigate}
          />
        </SidebarFooter>
      </Sidebar>

      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
      />
    </>
  )
}
