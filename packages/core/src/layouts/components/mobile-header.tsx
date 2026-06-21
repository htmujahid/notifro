import { BellIcon, SearchIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { RendericalMark } from "../../components/renderical-logo"
import { useUnreadCount } from "../../hooks/inbox"

export function MobileHeader({ onSearchOpen }: { onSearchOpen: () => void }) {
  const navigate = useNavigate()
  const { data: unreadData } = useUnreadCount()
  const unreadCount = unreadData?.count ?? 0

  return (
    <header
      className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 pb-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <div className="flex items-center gap-2">
        <RendericalMark className="size-[18px]" />
        <span className="text-sm font-semibold tracking-tight">Renderical</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearchOpen}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Search"
        >
          <SearchIcon className="size-4" />
        </button>
        <button
          onClick={() => navigate("/notifications")}
          className="relative flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
