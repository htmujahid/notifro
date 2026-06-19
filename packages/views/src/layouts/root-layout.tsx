import { Suspense } from "react"
import { Outlet } from "react-router"

export default function RootLayout() {
  return (
    <div className="min-h-svh">
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  )
}
