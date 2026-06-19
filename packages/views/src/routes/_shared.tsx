import { lazy } from "react"
import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("../layouts/auth-layout"))
const NotFoundPage = lazy(() => import("../pages/not-found"))

export const sharedRoutes: RouteObject[] = [
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    element: <AuthLayout />,
    children: [],
  },
]
