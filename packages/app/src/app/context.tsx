import { createContext, useContext, useMemo } from "react"
import { ThemeProvider } from "@workspace/ui-primitives/components/theme-provider"
import { AuthProvider } from "../auth/context"
import type { AuthClient } from "../auth/client"
import { QueryProvider } from "./query"

export type Platform = "web" | "desktop" | "android" | "ios"

export interface AppContextValue {
  platform: Platform
  isNative: boolean
  isWeb: boolean
  isDesktop: boolean
  isMobile: boolean
  authRedirectURL: string
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppProviderProps {
  platform: Platform
  authClient: AuthClient
  authRedirectURL: string
  children: React.ReactNode
}

export function AppProvider({ platform, authClient, authRedirectURL, children }: AppProviderProps) {
  const value = useMemo<AppContextValue>(
    () => ({
      platform,
      isWeb: platform === "web",
      isDesktop: platform === "desktop",
      isMobile: platform === "android" || platform === "ios",
      isNative: platform !== "web",
      authRedirectURL,
    }),
    [platform, authRedirectURL],
  )

  return (
    <ThemeProvider>
      <QueryProvider>
        <AppContext.Provider value={value}>
          <AuthProvider client={authClient}>{children}</AuthProvider>
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
