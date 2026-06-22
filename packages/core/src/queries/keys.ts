import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@renderical/app/auth/context"

export const apiKeyKeys = {
  all: ["developers"] as const,
  apiKeys: () => [...apiKeyKeys.all, "keys"] as const,
}

/** Unwrap a better-auth client `{ data, error }` result, throwing on error. */
async function unwrapAuth<T>(
  p: Promise<{ data: T | null; error: unknown }>
): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  if (data == null) throw new Error("Request failed")
  return data
}

export function useApiKeys() {
  const auth = useAuth()
  return useQuery({
    queryKey: apiKeyKeys.apiKeys(),
    queryFn: () => unwrapAuth(auth.apiKey.list()),
    // better-auth returns the full list; surface the keys array directly.
    select: (data) => data.apiKeys,
  })
}

export function useCreateApiKey() {
  const auth = useAuth()
  const qc = useQueryClient()
  return useMutation({
    // `mode` ("live" | "test") is stored in metadata so a key carries its
    // intended environment — the rest of our system reads it off the key.
    mutationFn: (args: { name: string; mode?: "live" | "test" }) =>
      unwrapAuth(
        auth.apiKey.create({
          name: args.name,
          prefix: "rk_",
          metadata: { mode: args.mode ?? "live" },
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeyKeys.apiKeys() }),
  })
}

export function useRevokeApiKey() {
  const auth = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrapAuth(auth.apiKey.delete({ keyId: id })),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeyKeys.apiKeys() }),
  })
}
