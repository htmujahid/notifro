import { createContext, useContext, useMemo } from "react"

import { createApiClient } from "@notifro/api-client/client"
import { ApiClientProvider } from "@notifro/api-client/context"
import { ThemeProvider } from "@notifro/ui-primitives/components/theme-provider"

import type { AuthClient } from "../auth/client"
import { AuthProvider } from "../auth/context"
import { QueryProvider } from "./query"

export type Platform = "web" | "desktop" | "android" | "ios"

export interface AppContextValue {
  platform: Platform
  isNative: boolean
  isWeb: boolean
  isDesktop: boolean
  isMobile: boolean
  appBaseURL: string
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppProviderProps {
  platform: Platform
  authClient: AuthClient
  apiBaseURL: string
  appBaseURL: string
  children: React.ReactNode
}

export function AppProvider({
  platform,
  authClient,
  apiBaseURL,
  appBaseURL,
  children,
}: AppProviderProps) {
  const value = useMemo<AppContextValue>(
    () => ({
      platform,
      isWeb: platform === "web",
      isDesktop: platform === "desktop",
      isMobile: platform === "android" || platform === "ios",
      isNative: platform !== "web",
      appBaseURL,
    }),
    [platform, appBaseURL]
  )

  const apiClient = useMemo(() => createApiClient(apiBaseURL), [apiBaseURL])

  return (
    <ThemeProvider>
      <QueryProvider>
        <AppContext.Provider value={value}>
          <ApiClientProvider client={apiClient}>
            <AuthProvider client={authClient}>{children}</AuthProvider>
          </ApiClientProvider>
        </AppContext.Provider>
      </QueryProvider>
    </ThemeProvider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within <AppProvider>")
  return ctx
}
