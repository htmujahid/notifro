import { lazy } from "react"

import type { RouteObject } from "react-router"

const NotFoundPage = lazy(() => import("../../pages/not-found"))
const StatusPage = lazy(() => import("../../pages/status"))
const HelloPage = lazy(() => import("../../pages/hello"))

export const publicRoutes: RouteObject[] = [
  { path: "status", element: <StatusPage /> },
  { path: "hello", element: <HelloPage /> },
]

export const notFoundRoute: RouteObject = {
  path: "*",
  element: <NotFoundPage />,
}
