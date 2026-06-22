# @notifro/api-client

Cookie-authenticated fetch client for Notifro product endpoints + TanStack Query hook conventions.

## Setup

`AppProvider` (from `@notifro/app/app/context`) constructs the client once from `apiBaseURL` and exposes it via `ApiClientProvider`. Any component inside `AppProvider` can call `useApiClient()`.

## Client

```ts
import { createApiClient } from "@notifro/api-client/client"

const api = createApiClient("http://localhost:8787")

// GET with optional query params
const result = await api.get<{ message: string }>("/api/hello")

// GET with list params (pagination, sort, filter)
const list = await api.get<ListResponse<Channel>>("/api/channels", {
  limit: 20,
  cursor: "abc",
  sort: "createdAt",
  order: "desc",
  type: "email",       // resource-specific filter
})

// Mutations
await api.post("/api/channels", { type: "email", name: "Transactional" })
await api.patch("/api/channels/123", { name: "Marketing" })
await api.delete("/api/channels/123")
```

Non-2xx responses throw `ApiClientError` with the server's `code`, `message`, and optional `details`.

```ts
import { isApiError } from "@notifro/api-client/error"

try {
  await api.get("/api/channels")
} catch (e) {
  if (isApiError(e, "unauthenticated")) redirect("/login")
  if (isApiError(e, "forbidden")) showToast("Not allowed")
  throw e
}
```

## Hook convention

All resource hooks live in `@notifro/core/hooks/<resource>.ts`. The pattern:

### Query-key factory

```ts
export const channelKeys = {
  all: ["channels"] as const,
  list: (params: ChannelListParams) => ["channels", "list", params] as const,
  detail: (id: string) => ["channels", id] as const,
}
```

List params are part of the key. Changing sort/filter/cursor triggers a refetch automatically.

### useQuery (single resource)

```ts
export function useChannel(id: string) {
  const api = useApiClient()
  return useQuery({
    queryKey: channelKeys.detail(id),
    queryFn: () => api.get<Channel>(`/api/channels/${id}`),
    enabled: !!id,
  })
}
```

### useQuery (offset-paginated list)

```ts
export function useChannels(params: ChannelListParams) {
  const api = useApiClient()
  return useQuery({
    queryKey: channelKeys.list(params),
    queryFn: () => api.get<ListResponse<Channel>>("/api/channels", params),
  })
}
```

### useInfiniteQuery (cursor-paginated list)

Use for lists where the server returns `nextCursor`.

```ts
export function useChannelsFeed(params: Omit<ChannelListParams, "cursor">) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: channelKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<Channel>>("/api/channels", { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
```

Typed `sort` and `order` values should be declared as unions from the server's allow-list so an unsupported value is a compile error:

```ts
type ChannelSort = "createdAt" | "name"

interface ChannelListParams extends ListParams {
  sort?: ChannelSort
  type?: string
}
```

### useMutation

```ts
export function useCreateChannel() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateChannelBody) => api.post<Channel>("/api/channels", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: channelKeys.all }),
  })
}
```

Always invalidate via the `all` key so both lists and details refetch.
