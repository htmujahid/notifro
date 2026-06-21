import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerPrompts } from "./prompts.js"
import { registerResources } from "./resources.js"
import { registerTools } from "./tools.js"

export { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"

export interface McpConfig {
  baseUrl: string
  apiKey: string
}

export function createMcpServer(config: McpConfig): McpServer {
  const server = new McpServer({ name: "renderical", version: "1.0.0" })
  registerTools(server, config)
  registerResources(server, config)
  registerPrompts(server)
  return server
}
