import { createContext, useContext } from "react"

import type { AuthClient } from "./client"

export type { AuthClient }

const AuthContext = createContext<AuthClient | null>(null)

export function AuthProvider({
  client,
  children,
}: {
  client: AuthClient
  children: React.ReactNode
}) {
  return <AuthContext.Provider value={client}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthClient {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
