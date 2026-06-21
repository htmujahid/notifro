import { Suspense, useEffect } from "react"

import { App as CapacitorApp } from "@capacitor/app"
import { Preferences } from "@capacitor/preferences"
import { RouterProvider, createHashRouter } from "react-router"

import { AppProvider } from "@renderical/app/app/context"
import { createMobileAuthClient } from "@renderical/app/auth/client.mobile"
import {
  NATIVE_REDIRECT_URL,
  deepLinkToPath,
} from "@renderical/app/auth/native-url"
import { routes } from "@renderical/views/routes/ios"

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
    <AppProvider
      platform="ios"
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
