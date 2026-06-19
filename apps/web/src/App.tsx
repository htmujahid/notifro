import { Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import { AppProvider } from "@workspace/core/app/context"
import { createWebAuthClient } from "@workspace/core/auth/client.web"
import { routes } from "@workspace/views/routes/web"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createWebAuthClient(API_URL)
const router = createBrowserRouter(routes)

export function App() {
  return (
    <AppProvider platform="web" authClient={authClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
