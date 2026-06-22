import { Suspense, useEffect } from "react"

import { RouterProvider, createHashRouter } from "react-router"

import { AppProvider } from "@notifro/app/app/context"
import { createDesktopAuthClient } from "@notifro/app/auth/client.desktop"
import {
  NATIVE_REDIRECT_URL,
  deepLinkToPath,
} from "@notifro/app/auth/native-url"
import { routes } from "@notifro/views/routes/desktop"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787"
const authClient = createDesktopAuthClient(API_URL)
const router = createHashRouter(routes)

export function App() {
  useEffect(() => {
    return window.desktop?.onDeepLink((url) => {
      const path = deepLinkToPath(url)
      if (path) router.navigate(path)
    })
  }, [])

  return (
    <AppProvider
      platform="desktop"
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
