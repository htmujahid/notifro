import { Suspense, useEffect } from "react"

import { App as CapacitorApp } from "@capacitor/app"
import { Preferences } from "@capacitor/preferences"
import { createApiClient } from "@workspace/api-client/client"
import { AppProvider } from "@workspace/app/app/context"
import { createMobileAuthClient } from "@workspace/app/auth/client.mobile"
import {
  NATIVE_REDIRECT_URL,
  deepLinkToPath,
} from "@workspace/app/auth/deep-link"
import { registerForPush } from "@workspace/mobile-shared/push"
import { routes } from "@workspace/views/routes/android"
import { RouterProvider, createHashRouter } from "react-router"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createMobileAuthClient(API_URL, Preferences)
const apiClient = createApiClient(API_URL)
const router = createHashRouter(routes)

export function App() {
  useEffect(() => {
    const handle = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const path = deepLinkToPath(url)
      if (path) router.navigate(path)
    })
    void registerForPush(apiClient, "android").catch(() => {})
    return () => {
      handle.then((listener) => listener.remove())
    }
  }, [])

  return (
    <AppProvider
      platform="android"
      authClient={authClient}
      apiBaseURL={API_URL}
      appBaseURL={NATIVE_REDIRECT_URL}
    >
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  )
}
