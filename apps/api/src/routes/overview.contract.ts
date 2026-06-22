import { createRoute, z } from "@hono/zod-openapi"

export const OnboardingStepsSchema = z.object({
  connect_channel: z.boolean(),
  send_test: z.boolean(),
  explore_templates: z.boolean(),
})

export const OnboardingSchema = z.object({
  complete: z.boolean(),
  dismissed: z.boolean(),
  steps: OnboardingStepsSchema,
})

export const RecentActivityItemSchema = z.object({
  id: z.string(),
  subject: z.string().nullable(),
  channels: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

export const OverviewResponseSchema = z.object({
  channels: z.number(),
  sent7d: z.number(),
  sent30d: z.number(),
  successRate: z.number(),
  recentActivity: z.array(RecentActivityItemSchema),
  unreadInbox: z.number(),
  onboarding: OnboardingSchema,
})

export const overviewRoute = createRoute({
  method: "get",
  path: "/overview",
  responses: {
    200: {
      content: { "application/json": { schema: OverviewResponseSchema } },
      description: "Overview data",
    },
  },
})

export const TestSendResponseSchema = z.object({
  ok: z.boolean(),
  notificationId: z.string(),
})

export const testSendRoute = createRoute({
  method: "post",
  path: "/overview/test-send",
  responses: {
    200: {
      content: { "application/json": { schema: TestSendResponseSchema } },
      description: "Test notification sent",
    },
  },
})

export const OnboardingPatchBodySchema = z.object({
  dismiss: z.boolean().optional(),
  step: z.string().optional(),
  completed: z.boolean().optional(),
})

export const onboardingPatchRoute = createRoute({
  method: "patch",
  path: "/onboarding",
  request: {
    body: {
      content: { "application/json": { schema: OnboardingPatchBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Updated",
    },
  },
})
