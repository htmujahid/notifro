import { Suspense } from "react"

import { AppProvider } from "@renderical/app/app/context"
import { createWebAuthClient } from "@renderical/app/auth/client.web"
import { routes } from "@renderical/views/routes/web"
import { RouterProvider, createBrowserRouter } from "react-router"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin
const authClient = createWebAuthClient(API_URL)
const router = createBrowserRouter(routes)

export function App() {
  return (
    <AppProvider
      platform="web"
      authClient={authClient}
      apiBaseURL={API_URL}
      appBaseURL={FRONTEND_URL}
    >
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
