import { createBaseAuthClient } from "./client"

export function createWebAuthClient(baseURL: string) {
  return createBaseAuthClient(baseURL, {
    fetchOptions: {
      credentials: "include",
    },
  })
}
