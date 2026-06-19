import { Suspense } from "react"
import { createHashRouter, RouterProvider } from "react-router"
import { Preferences } from "@capacitor/preferences"
import { AppProvider } from "@workspace/app/app/context"
import { createMobileAuthClient } from "@workspace/app/auth/client.mobile"
import { routes } from "@workspace/views/routes/android"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createMobileAuthClient(API_URL, Preferences)
const router = createHashRouter(routes)

export function App() {
  return (
    <AppProvider platform="android" authClient={authClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
