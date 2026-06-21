import { useSession } from "@workspace/app/auth/use-session"
import { Navigate, Outlet, useLocation } from "react-router"

export function ProtectedRoute() {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (!session) {
    const next = location.pathname + location.search
    return (
      <Navigate to={`/auth/sign-in?next=${encodeURIComponent(next)}`} replace />
    )
  }

  return <Outlet />
}
