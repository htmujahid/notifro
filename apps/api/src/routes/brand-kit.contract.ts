import { createRoute, z } from "@hono/zod-openapi"

export const BrandKitDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  logoUrl: z.string().nullable(),
  colors: z.string().nullable(),
  fontStack: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UpdateBrandKitSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  colors: z.record(z.string(), z.string()).nullable().optional(),
  fontStack: z.string().nullable().optional(),
})

export const getRoute = createRoute({
  method: "get",
  path: "/brand-kit",
  responses: {
    200: {
      content: { "application/json": { schema: BrandKitDtoSchema } },
      description: "Brand kit",
    },
  },
})

export const putRoute = createRoute({
  method: "put",
  path: "/brand-kit",
  request: {
    body: { content: { "application/json": { schema: UpdateBrandKitSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BrandKitDtoSchema } },
      description: "Updated brand kit",
    },
  },
})
