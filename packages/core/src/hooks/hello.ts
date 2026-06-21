import { useApiClient } from "@renderical/api-client/context"

import { useQuery } from "@tanstack/react-query"

export const helloKeys = {
  all: ["hello"] as const,
}

export function useHello() {
  const api = useApiClient()
  return useQuery({
    queryKey: helloKeys.all,
    queryFn: () => api.get<{ message: string }>("/api/hello"),
  })
}
