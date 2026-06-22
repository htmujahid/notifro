// @ts-check
import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://renderical.com",
  adapter: cloudflare(),
  integrations: [react(), sitemap()],
})
