import { createBaseAuthClient } from "./client"

export function createDesktopAuthClient(baseURL: string) {
  return createBaseAuthClient(baseURL, {
    fetchOptions: {
      credentials: "include",
    },
  })
}
