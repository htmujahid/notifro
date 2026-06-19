import { Navigate, Outlet } from "react-router"
import { useSession } from "@workspace/app/auth/use-session"

export function ProtectedRoute() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth/sign-in" replace />
  }

  return <Outlet />
}
