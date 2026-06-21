import { Suspense, useEffect } from "react"

import { AppProvider } from "@renderical/app/app/context"
import { createDesktopAuthClient } from "@renderical/app/auth/client.desktop"
import {
  NATIVE_REDIRECT_URL,
  deepLinkToPath,
} from "@renderical/app/auth/deep-link"
import { routes } from "@renderical/views/routes/desktop"
import { RouterProvider, createHashRouter } from "react-router"

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
