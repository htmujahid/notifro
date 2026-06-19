import { Suspense, useEffect } from "react"
import { createHashRouter, RouterProvider } from "react-router"
import { App as CapacitorApp } from "@capacitor/app"
import { Preferences } from "@capacitor/preferences"
import { AppProvider } from "@workspace/app/app/context"
import { createMobileAuthClient } from "@workspace/app/auth/client.mobile"
import { NATIVE_REDIRECT_URL, deepLinkToPath } from "@workspace/app/auth/deep-link"
import { routes } from "@workspace/views/routes/android"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createMobileAuthClient(API_URL, Preferences)
const router = createHashRouter(routes)

export function App() {
  useEffect(() => {
    const handle = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const path = deepLinkToPath(url)
      if (path) router.navigate(path)
    })
    return () => {
      handle.then((listener) => listener.remove())
    }
  }, [])

  return (
    <AppProvider platform="android" authClient={authClient} appBaseURL={NATIVE_REDIRECT_URL}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
