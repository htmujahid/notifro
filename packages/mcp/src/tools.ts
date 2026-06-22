import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import type { McpConfig } from "./server.js"

function authHeaders(config: McpConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  }
}

async function apiGet<T>(
  config: McpConfig,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${config.baseUrl}${path}`)
  if (params)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: authHeaders(config) })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

async function apiPost<T>(
  config: McpConfig,
  path: string,
  body: unknown,
  extra?: Record<string, string>
): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { ...authHeaders(config), ...extra },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${b}`)
  }
  return res.json() as Promise<T>
}

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] }
}

async function checkRequiresApproval(
  config: McpConfig,
  tool: string
): Promise<boolean> {
  try {
    const data = await apiGet<{
      data: Array<{ tool: string; requiresApproval: number }>
    }>(config, "/api/mcp/gates")
    const gate = data.data.find((g) => g.tool === tool)
    return gate ? gate.requiresApproval === 1 : true
  } catch {
    return true
  }
}

const RecipientSchema = z.union([
  z.object({ type: z.literal("user"), userId: z.string() }),
  z.object({
    type: z.literal("contact"),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
])

const ContentSchema = z
  .object({
    title: z.string().optional(),
    subject: z.string().optional(),
    body: z.object({
      text: z.string().optional(),
      markdown: z.string().optional(),
    }),
  })
  .optional()

export function registerTools(server: McpServer, config: McpConfig): void {
  server.registerTool(
    "list_channels",
    {
      description: "List all notification channels configured for the account",
      inputSchema: { q: z.string().optional() },
    },
    async (args) => {
      const params: Record<string, string> = {}
      if (args.q) params.q = args.q
      const data = await apiGet(config, "/api/connections", params)
      return text(JSON.stringify(data, null, 2))
    }
  )

  server.registerTool(
    "send_notification",
    {
      description:
        "Send a notification. Returns an approvalToken when approval is required; call approve_action to execute.",
      inputSchema: {
        recipient: RecipientSchema,
        channels: z.array(z.string()),
        content: ContentSchema,
        topicKey: z.string().optional(),
        sendAt: z.string().optional(),
      },
    },
    async (args) => {
      const needsApproval = await checkRequiresApproval(
        config,
        "send_notification"
      )

      if (needsApproval) {
        const preview = await apiPost(config, "/api/notifications", args, {
          "X-Renderical-Sandbox": "true",
        }).catch(() => null)

        const pending = await apiPost<{ id: string }>(
          config,
          "/api/mcp/pending",
          {
            tool: "send_notification",
            payload: JSON.stringify({
              endpoint: "/api/notifications",
              method: "POST",
              body: args,
            }),
          }
        )

        return text(
          JSON.stringify(
            {
              requiresApproval: true,
              approvalToken: pending.id,
              preview,
              message: `Approval required. Call approve_action with approvalToken "${pending.id}".`,
            },
            null,
            2
          )
        )
      }

      const result = await apiPost(config, "/api/notifications", args)
      return text(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    "schedule_notification",
    {
      description:
        "Schedule a notification to be sent at a specific future time",
      inputSchema: {
        recipient: RecipientSchema,
        channels: z.array(z.string()),
        content: ContentSchema,
        sendAt: z.string(),
        timezone: z.string().optional(),
      },
    },
    async (args) => {
      const result = await apiPost(config, "/api/schedules", args)
      return text(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    "get_delivery_status",
    {
      description: "Get delivery status for a notification by its ID",
      inputSchema: { notificationId: z.string() },
    },
    async (args) => {
      const data = await apiGet(config, "/api/deliveries", {
        notificationId: args.notificationId,
        limit: "50",
      })
      return text(JSON.stringify(data, null, 2))
    }
  )

  server.registerTool(
    "create_template",
    {
      description: "Create a new notification template",
      inputSchema: {
        name: z.string(),
        slug: z.string(),
        defaultLocale: z.string().default("en"),
        content: z.object({
          title: z.string().optional(),
          body: z.object({
            text: z.string().optional(),
            markdown: z.string().optional(),
          }),
        }),
      },
    },
    async (args) => {
      const result = await apiPost(config, "/api/templates", args)
      return text(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    "render_preview",
    {
      description: "Render a notification as a sandbox preview without sending",
      inputSchema: {
        recipient: RecipientSchema,
        channels: z.array(z.string()),
        content: ContentSchema,
        templateId: z.string().optional(),
        templateData: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (args) => {
      const result = await apiPost(config, "/api/notifications", args, {
        "X-Renderical-Sandbox": "true",
      })
      return text(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    "query_analytics",
    {
      description: "Query delivery analytics and recent delivery statistics",
      inputSchema: {
        channel: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async (args) => {
      const params: Record<string, string> = { limit: String(args.limit ?? 20) }
      if (args.channel) params.channel = args.channel
      if (args.status) params.status = args.status
      const data = await apiGet(config, "/api/deliveries", params)
      return text(JSON.stringify(data, null, 2))
    }
  )

  server.registerTool(
    "approve_action",
    {
      description:
        "Approve a pending MCP action that was queued for human review",
      inputSchema: { approvalToken: z.string() },
    },
    async (args) => {
      const result = await apiPost(
        config,
        `/api/mcp/pending/${args.approvalToken}/approve`,
        {}
      )
      return text(JSON.stringify(result, null, 2))
    }
  )
}
