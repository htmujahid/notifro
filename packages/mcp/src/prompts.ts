import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "send-notification-help",
    { description: "Guide for sending a notification via MCP tools" },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "To send a notification via Notifro MCP:",
              "1. Call list_channels to see available channels",
              "2. Call send_notification with recipient, channels, and content",
              "3. If approval is required, you will receive an approvalToken: share it for review",
              "4. The approver calls approve_action with the token to execute the send",
              "",
              'Example: "Send an email to user@example.com about their order confirmation"',
            ].join("\n"),
          },
        },
      ],
    })
  )

  server.registerPrompt(
    "check-delivery-status",
    {
      description: "Guide for checking delivery status of a notification",
      argsSchema: {
        notificationId: z.string().describe("The notification ID to check"),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Check delivery status for notification ${args.notificationId}. Call get_delivery_status with this ID.`,
          },
        },
      ],
    })
  )

  server.registerPrompt(
    "setup-approval-gates",
    {
      description:
        "Guide for configuring which MCP actions require human approval",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "To configure MCP approval gates:",
              "- By default, send_notification requires human approval",
              '- To disable approval: POST /api/mcp/gates with { tool: "send_notification", requiresApproval: false }',
              '- To re-enable: POST /api/mcp/gates with { tool: "send_notification", requiresApproval: true }',
              "- Pending approvals: GET /api/mcp/pending",
              "- Approve: POST /api/mcp/pending/:id/approve",
              "- Reject: POST /api/mcp/pending/:id/reject",
            ].join("\n"),
          },
        },
      ],
    })
  )
}
