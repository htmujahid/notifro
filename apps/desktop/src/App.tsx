import { Suspense } from "react"
import { createHashRouter, RouterProvider } from "react-router"
import { AppProvider } from "@workspace/core/app/context"
import { createDesktopAuthClient } from "@workspace/core/auth/client.desktop"
import { routes } from "@workspace/views/routes/desktop"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createDesktopAuthClient(API_URL)
const router = createHashRouter(routes)

export function App() {
  return (
    <AppProvider platform="desktop" authClient={authClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
