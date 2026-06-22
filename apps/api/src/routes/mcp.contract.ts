import { createRoute, z } from "@hono/zod-openapi"

export const McpGateDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tool: z.string(),
  requiresApproval: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UpsertGateSchema = z.object({
  tool: z.string().min(1),
  requiresApproval: z.boolean().default(true),
})

export const McpPendingDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tool: z.string(),
  status: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreatePendingSchema = z.object({
  tool: z.string().min(1),
  payload: z.string(),
})

export const listGatesRoute = createRoute({
  method: "get",
  path: "/mcp/gates",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: z.array(McpGateDtoSchema) }),
        },
      },
      description: "Approval gates",
    },
  },
})

export const upsertGateRoute = createRoute({
  method: "post",
  path: "/mcp/gates",
  request: {
    body: { content: { "application/json": { schema: UpsertGateSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: McpGateDtoSchema } },
      description: "Upserted gate",
    },
  },
})

export const deleteGateRoute = createRoute({
  method: "delete",
  path: "/mcp/gates/:id",
  responses: { 204: { description: "Deleted" } },
})

export const listPendingRoute = createRoute({
  method: "get",
  path: "/mcp/pending",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: z.array(McpPendingDtoSchema) }),
        },
      },
      description: "Pending actions",
    },
  },
})

export const createPendingRoute = createRoute({
  method: "post",
  path: "/mcp/pending",
  request: {
    body: { content: { "application/json": { schema: CreatePendingSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: McpPendingDtoSchema } },
      description: "Created pending action",
    },
  },
})

export const approveRoute = createRoute({
  method: "post",
  path: "/mcp/pending/:id/approve",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ approved: z.boolean(), result: z.unknown() }),
        },
      },
      description: "Approved and executed",
    },
  },
})

export const rejectRoute = createRoute({
  method: "post",
  path: "/mcp/pending/:id/reject",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ rejected: z.boolean() }) },
      },
      description: "Rejected",
    },
  },
})
