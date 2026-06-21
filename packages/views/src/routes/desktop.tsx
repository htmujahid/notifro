import { lazy } from "react"
import type { RouteObject } from "react-router"
import { ProtectedRoute } from "@workspace/core/components/protected-route"
import { sharedAuthRoutes, sharedProtectedChildren, publicRoutes, notFoundRoute } from "./_shared"

const RootLayout = lazy(() => import("@workspace/core/layouts/root-layout"))
const AppLayout = lazy(() => import("@workspace/core/layouts/app-layout"))
const DashboardPage = lazy(() => import("../pages/dashboard"))

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              ...sharedProtectedChildren,
            ],
          },
        ],
      },
      sharedAuthRoutes,
      ...publicRoutes,
      notFoundRoute,
    ],
  },
]
