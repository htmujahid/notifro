import { SearchIcon } from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Kbd } from "@workspace/ui/components/kbd"

export function SiteHeader({ onSearchOpen }: { onSearchOpen: () => void }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        {/* breadcrumbs slot */}
        <div className="flex-1" />
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SearchIcon className="size-3.5" />
          <Kbd>⌘K</Kbd>
        </button>
      </div>
    </header>
  )
}
