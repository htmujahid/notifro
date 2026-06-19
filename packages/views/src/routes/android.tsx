import { lazy } from "react"
import type { RouteObject } from "react-router"
import { sharedRoutes } from "./_shared"

const RootLayout = lazy(() => import("../layouts/root-layout"))
const HomePage = lazy(() => import("../pages/home"))

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...sharedRoutes,
    ],
  },
]
