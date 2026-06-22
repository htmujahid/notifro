import { useQuery } from "@tanstack/react-query"

import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export function HelloView() {
  const client = useApiClient()

  const { data, isPending } = useQuery({
    queryKey: ["hello"],
    queryFn: () => unwrap(client.api.hello.$get()),
  })

  return (
    <div>
      {isPending ? <p>Loading…</p> : <h1>{data?.message}</h1>}
    </div>
  )
}
