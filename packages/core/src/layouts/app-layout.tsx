import { Suspense, useState } from "react"

import { Outlet } from "react-router"

import { useApp } from "@notifro/app/app/context"
import { SidebarInset, SidebarProvider } from "@notifro/ui/components/sidebar"
import { Toaster } from "@notifro/ui/components/sonner"

import { AppSidebar } from "./components/app-sidebar"
import { MobileHeader } from "./components/mobile-header"
import { MobileTabBar } from "./components/mobile-tab-bar"
import { SearchCommand } from "./components/search-command"
import { SiteHeader } from "./components/site-header"

export default function AppLayout() {
  const { isMobile } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)

  if (isMobile) {
    return (
      <div className="flex h-svh flex-col bg-background">
        <MobileHeader onSearchOpen={() => setSearchOpen(true)} />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <MobileTabBar />
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
        <Toaster />
      </div>
    )
  }

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
