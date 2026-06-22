import { useQuery } from "@tanstack/react-query"

import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const helloKeys = {
  all: ["hello"] as const,
}

export function useHello() {
  const client = useApiClient()
  return useQuery({
    queryKey: helloKeys.all,
    queryFn: () => unwrap(client.api.hello.$get()),
  })
}
