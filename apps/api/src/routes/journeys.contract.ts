import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { createdAt: "createdAt", name: "name" }
export const FILTERABLE = {}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const RUN_SORTABLE = { createdAt: "createdAt", updatedAt: "updatedAt" }
export const RUN_DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const JourneyDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.string(),
  trigger: z.string().nullable(),
  steps: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const JourneyRunDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  journeyId: z.string(),
  recipientId: z.string(),
  status: z.string(),
  currentStepId: z.string(),
  nextResumeAt: z.string().nullable(),
  context: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListJourneysResponseSchema = z.object({
  data: z.array(JourneyDtoSchema),
  nextCursor: z.string().nullable(),
})

export const ListRunsResponseSchema = z.object({
  data: z.array(JourneyRunDtoSchema),
  nextCursor: z.string().nullable(),
})

export const CreateJourneySchema = z.object({
  name: z.string().min(1),
  trigger: z
    .union([
      z.object({
        type: z.literal("event"),
        event: z.string(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      z.object({ type: z.literal("manual") }),
      z.object({ type: z.literal("segment"), segmentId: z.string() }),
    ])
    .optional(),
  steps: z.record(
    z.string(),
    z.object({
      kind: z.enum(["send", "wait", "branch", "exit"]),
      config: z.record(z.string(), z.unknown()),
      next: z.string().nullable().optional(),
      branches: z
        .array(
          z.object({
            condition: z.record(z.string(), z.unknown()),
            next: z.string(),
          })
        )
        .optional(),
    })
  ),
})

export const PatchJourneySchema = z.object({
  name: z.string().min(1).optional(),
  trigger: z
    .union([
      z.object({
        type: z.literal("event"),
        event: z.string(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      z.object({ type: z.literal("manual") }),
      z.object({ type: z.literal("segment"), segmentId: z.string() }),
    ])
    .nullable()
    .optional(),
  steps: z
    .record(
      z.string(),
      z.object({
        kind: z.enum(["send", "wait", "branch", "exit"]),
        config: z.record(z.string(), z.unknown()),
        next: z.string().nullable().optional(),
        branches: z
          .array(
            z.object({
              condition: z.record(z.string(), z.unknown()),
              next: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  status: z.enum(["paused"]).optional(),
})

export const EnrollSchema = z.object({
  recipientId: z.string(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/journeys",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListJourneysResponseSchema } },
      description: "Journeys list",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/journeys",
  request: {
    body: { content: { "application/json": { schema: CreateJourneySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey created",
    },
  },
})

export const getRoute = createRoute({
  method: "get",
  path: "/journeys/:id",
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey detail",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/journeys/:id",
  request: {
    body: { content: { "application/json": { schema: PatchJourneySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey updated",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/journeys/:id",
  responses: {
    204: { description: "Journey deleted" },
  },
})

export const activateRoute = createRoute({
  method: "post",
  path: "/journeys/:id/activate",
  responses: {
    200: {
      content: { "application/json": { schema: JourneyDtoSchema } },
      description: "Journey activated",
    },
  },
})

export const listRunsRoute = createRoute({
  method: "get",
  path: "/journeys/:id/runs",
  request: {
    query: listQuerySchema({
      sortable: RUN_SORTABLE,
      filterable: {},
      defaultSort: RUN_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListRunsResponseSchema } },
      description: "Journey runs",
    },
  },
})

export const enrollRoute = createRoute({
  method: "post",
  path: "/journeys/:id/enroll",
  request: {
    body: { content: { "application/json": { schema: EnrollSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: JourneyRunDtoSchema } },
      description: "Recipient enrolled",
    },
  },
})
