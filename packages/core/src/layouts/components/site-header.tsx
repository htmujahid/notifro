import { Kbd } from "@renderical/ui/components/kbd"
import { Separator } from "@renderical/ui/components/separator"
import { SidebarTrigger } from "@renderical/ui/components/sidebar"
import { BellIcon, SearchIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { useUnreadCount } from "../../hooks/inbox"

export function SiteHeader({ onSearchOpen }: { onSearchOpen: () => void }) {
  const navigate = useNavigate()
  const { data: unreadData } = useUnreadCount()
  const unreadCount = unreadData?.count ?? 0

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <div className="flex-1" />
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SearchIcon className="size-3.5" />
          <Kbd>⌘K</Kbd>
        </button>
        <button
          onClick={() => navigate("/notifications")}
          className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
