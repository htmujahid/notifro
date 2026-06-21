import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpConfig } from './server.js'

export function registerResources(server: McpServer, config: McpConfig): void {
  server.resource('channels', 'renderical://channels', { description: 'Active notification channels' }, async () => {
    const res = await fetch(`${config.baseUrl}/api/connections`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    const data = (await res.json()) as { data: unknown[] }
    return {
      contents: [{ uri: 'renderical://channels', text: JSON.stringify(data.data, null, 2), mimeType: 'application/json' }],
    }
  })

  server.resource('templates', 'renderical://templates', { description: 'Notification templates' }, async () => {
    const res = await fetch(`${config.baseUrl}/api/templates`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    const data = (await res.json()) as { data: unknown[] }
    return {
      contents: [{ uri: 'renderical://templates', text: JSON.stringify(data.data, null, 2), mimeType: 'application/json' }],
    }
  })

  server.resource('recent-deliveries', 'renderical://recent-deliveries', { description: 'Most recent delivery records' }, async () => {
    const res = await fetch(`${config.baseUrl}/api/deliveries?limit=20`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    const data = (await res.json()) as { data: unknown[] }
    return {
      contents: [{ uri: 'renderical://recent-deliveries', text: JSON.stringify(data.data, null, 2), mimeType: 'application/json' }],
    }
  })
}
