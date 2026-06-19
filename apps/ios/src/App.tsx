import { Suspense, useEffect } from "react"
import { createHashRouter, RouterProvider } from "react-router"
import { App as CapacitorApp } from "@capacitor/app"
import { Preferences } from "@capacitor/preferences"
import { AppProvider } from "@workspace/app/app/context"
import { createMobileAuthClient } from "@workspace/app/auth/client.mobile"
import { NATIVE_REDIRECT_URL, deepLinkToPath } from "@workspace/app/auth/deep-link"
import { routes } from "@workspace/views/routes/ios"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createMobileAuthClient(API_URL, Preferences)
const router = createHashRouter(routes)

export function App() {
  // `renderical://…` auth callbacks opened in the system browser are delivered
  // to the app via Capacitor's appUrlOpen event. Route them into the router.
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
    <AppProvider platform="ios" authClient={authClient} authRedirectURL={NATIVE_REDIRECT_URL}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
