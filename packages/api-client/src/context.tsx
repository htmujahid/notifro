import { createContext, useContext } from "react"

import type { ApiClient } from "./client"

const ApiClientContext = createContext<ApiClient | null>(null)

export interface ApiClientProviderProps {
  client: ApiClient
  children: React.ReactNode
}

export function ApiClientProvider({
  client,
  children,
}: ApiClientProviderProps) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  )
}

export function useApiClient(): ApiClient {
  const ctx = useContext(ApiClientContext)
  if (!ctx)
    throw new Error("useApiClient must be used within <ApiClientProvider>")
  return ctx
}
