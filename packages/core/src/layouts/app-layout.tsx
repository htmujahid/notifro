import { Suspense, useState } from "react"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { Toaster } from "@workspace/ui/components/sonner"
import { Outlet } from "react-router"

import { AppSidebar } from "./components/app-sidebar"
import { SearchCommand } from "./components/search-command"
import { SiteHeader } from "./components/site-header"

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader onSearchOpen={() => setSearchOpen(true)} />
        <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster />
    </SidebarProvider>
  )
}
