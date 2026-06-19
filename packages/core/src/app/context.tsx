import { createContext, useContext, useMemo } from "react"
import { AuthProvider } from "../auth/context"
import type { AuthClient } from "../auth/client"

export type Platform = "web" | "desktop" | "android" | "ios"

export interface AppContextValue {
  platform: Platform
  isNative: boolean
  isWeb: boolean
  isDesktop: boolean
  isMobile: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppProviderProps {
  platform: Platform
  authClient: AuthClient
  children: React.ReactNode
}

export function AppProvider({ platform, authClient, children }: AppProviderProps) {
  const value = useMemo<AppContextValue>(
    () => ({
      platform,
      isWeb: platform === "web",
      isDesktop: platform === "desktop",
      isMobile: platform === "android" || platform === "ios",
      isNative: platform !== "web",
    }),
    [platform],
  )

  return (
    <AppContext.Provider value={value}>
      <AuthProvider client={authClient}>{children}</AuthProvider>
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within <AppProvider>")
  return ctx
}
