#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { createMcpServer } from "./server.js"

const apiKey = process.env.RENDERICAL_API_KEY
if (!apiKey) {
  process.stderr.write(
    "Error: RENDERICAL_API_KEY environment variable is required\n"
  )
  process.exit(1)
}
const baseUrl = process.env.RENDERICAL_BASE_URL ?? "http://localhost:8787"

const server = createMcpServer({ baseUrl, apiKey })
const transport = new StdioServerTransport()
server.connect(transport).catch((err: Error) => {
  process.stderr.write(`Fatal: ${err.message}\n`)
  process.exit(1)
})
