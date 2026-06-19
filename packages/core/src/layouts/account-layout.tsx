import { Suspense } from "react"
import { Outlet } from "react-router"

export default function AccountLayout() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, and authentication settings.
        </p>
      </div>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  )
}
