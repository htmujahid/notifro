import { Suspense } from "react"

import { Outlet } from "react-router"

import { NuqsAdapter } from "nuqs/adapters/react-router/v7"

export default function RootLayout() {
  return (
    <NuqsAdapter>
      <div className="min-h-svh">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </NuqsAdapter>
  )
}
