import { useQuery } from "@tanstack/react-query"
import { useAuth } from "./context"

export const SESSION_QUERY_KEY = ["session"] as const

export function useSession() {
  const auth = useAuth()
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data } = await auth.getSession()
      return data ?? null
    },
    staleTime: Infinity,
  })
}
