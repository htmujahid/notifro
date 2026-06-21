import { lazy } from "react"

import { ProtectedRoute } from "@renderical/core/components/protected-route"
import type { RouteObject } from "react-router"

import {
  notFoundRoute,
  publicRoutes,
  sharedAuthRoutes,
  sharedProtectedChildren,
} from "./_shared"

const RootLayout = lazy(() => import("@renderical/core/layouts/root-layout"))
const AppLayout = lazy(() => import("@renderical/core/layouts/app-layout"))
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
