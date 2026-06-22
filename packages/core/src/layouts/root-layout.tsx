import { Suspense } from "react"

import { NuqsAdapter } from "nuqs/adapters/react-router/v7"
import { Outlet } from "react-router"

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
