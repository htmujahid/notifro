import { lazy } from "react"

import type { RouteObject } from "react-router"

import { ProtectedRoute } from "@notifro/core/components/protected-route"

import { sharedAuthRoutes } from "./shared/auth"
import { sharedProtectedChildren } from "./shared/protected"
import { notFoundRoute } from "./shared/public"

const RootLayout = lazy(() => import("@notifro/core/layouts/root-layout"))
const AppLayout = lazy(() => import("@notifro/core/layouts/app-layout"))
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
      notFoundRoute,
    ],
  },
]
