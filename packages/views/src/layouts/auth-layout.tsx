import { Suspense } from "react"
import { Outlet } from "react-router"

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
