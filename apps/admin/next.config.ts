import type { NextConfig } from "next"

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

const nextConfig: NextConfig = {
  /* config options here */
}

export default nextConfig

initOpenNextCloudflareForDev()
